# 02 — Modelo de Dominio y de Evidencia

> Documento **normativo y autoridad única** del modelo. El schema ejecutable (`public/proof/schemas/`, Sprint 1) y la implementación son **derivados** de este documento.
> Si un derivado diverge de esta prosa, **el derivado está mal**: se corrige el derivado, no el documento. Ver `05-feed-contract.md`.
> `Claim`, `Project` y `Evidence` son una sola ontología: se definen juntos porque cada uno solo tiene sentido respecto de los otros.

---

## 0. La cadena del dominio

La dirección de la cadena es la decisión de diseño más importante del sistema:

```
Claim  →  Project  →  Evidence  →  Source
```

Se lee: **una afirmación profesional** se apoya en **proyectos**, que producen **evidencia**, que proviene de **fuentes**.

La cadena inversa está prohibida:

```
Source  →  Metric  →  Dashboard        (NO)
```

Esa es la dirección que produce dashboards de vanity: la fuente decide qué se mide, la métrica se convierte en el mensaje, y nadie afirmó nunca nada falsable. Toda decisión de diseño se resuelve preguntando en qué dirección apunta.

Corolario formal, y es una restricción de datos, no un principio: **una métrica de evidencia sin `claim_id` no existe en el modelo.** No hay campo donde ponerla. «Métrica de evidencia» es un término definido, no un sinónimo de «número»: la distinción con la metadata operativa y de presentación está en §7.

---

## 1. Claim — entidad de primer nivel

**Un Claim es una afirmación profesional que queremos respaldar.** La escribe un humano. El sistema no genera claims, nunca.

Es la raíz del grafo, no un atributo de `Project`. La razón es que las afirmaciones que importan atraviesan proyectos: "construyo sistemas de software e IA usados en contextos reales" se apoya en varios proyectos a la vez, y ninguno de ellos la contiene.

### Forma

Dos bloques, y la separación es normativa: lo declarado se escribe a mano en el Registry, lo derivado lo computa el motor. **Un campo derivado escrito a mano hace fallar al validador.**

```
Claim — DECLARADO por un humano en el Registry
  id          slug estable, inmutable una vez publicado
  statement   la afirmación, en primera persona, escrita por un humano
  dimension   build | lead | teach
  project_ids [] uno o varios. Claim y Project son muchos-a-muchos
  evidence_ids[] evidencia que lo sostiene

Claim — DERIVADO por el motor desde evidence_ids (§1.1)
  provenance     declared | collected | derived | correlated | attested
                 └─ en V1 la derivación nunca produce `attested`: ninguna
                    fuente lo genera (§6). El enum publicado lo omite.
  verifiability  unverifiable | self_link | third_party_public | cryptographic
```

Ejemplo:

```yaml
id: builds-production-ai-systems
statement: Construyo sistemas de software e IA utilizados en contextos reales.
dimension: build
project_ids: [proyecto-a, proyecto-b]
evidence_ids: [...]
```

`kind` **no existe**. Estaba definido como requerido (`existence | authorship | continuity | collaboration | operation | education`) y se elimina de V1 por dos razones: sus valores mezclaban ejes distintos (`existence` describe la forma de la afirmación, `education` su dominio, `operation` una propiedad del proyecto que la sostiene), y su único consumidor mecánico era la regla de admisibilidad de `operation`, que se reformula abajo sin necesitar la taxonomía. Ampliar o reintroducir la taxonomía requiere una decisión humana y un ADR.

### 1.1 Estado efectivo: se deriva, no se declara

`Evidence` es la **única autoridad** sobre procedencia y verificabilidad (§4). El estado de un `Claim` es una función de su evidencia, no una segunda declaración que pueda discrepar de ella:

```
orden de verificabilidad:  unverifiable < self_link < third_party_public < cryptographic

verifiability(claim) := max{ e.verifiability : e ∈ evidence(claim) }
provenance(claim)    := e.provenance del registro que fija ese máximo
                        empate → el de occurred_at más antiguo (determinista)

evidence(claim) = ∅   ⇒   provenance: declared, verifiability: unverifiable
```

Consecuencias, y son deliberadas:

- Un `Claim` **no lleva** `provenance` ni `verifiability` en el Registry. No son campos de entrada.
- «Si `verifiability != unverifiable` hay al menos una evidencia con `public_url`» deja de ser un invariante que alguien debe imponer y pasa a ser un **teorema**: `third_party_public` y `cryptographic` solo existen en `Evidence` con `public_url` (§4).
- Un claim no puede presumir de verificabilidad que su evidencia no tiene. La discrepancia es inexpresable, no es que se detecte.
- `attestor` **no existe en V1**. Era el atestiguador de un claim `attested`, y la única fuente de V1 es `github`, que nunca produce evidencia `attested` (§4, §6). Cuando exista una fuente que la produzca, `attestor` vivirá en `Evidence`, junto al hecho que describe. Declararlo hoy sería contrato anticipado sin productor.

### 1.2 Integridad del grafo

Reglas completas de las aristas. Las impone el validador; no son convenciones:

| # | Regla |
|---|---|
| G1 | `claim.project_ids` no puede estar vacío. |
| G2 | Todo id de `claim.project_ids` existe como `Project`. |
| G3 | Todo id de `claim.evidence_ids` existe como `Evidence`. |
| G4 | Si `e ∈ claim.evidence_ids` y `e.project_id != null`, entonces **`e.project_id ∈ claim.project_ids`**. Una evidencia no sostiene un claim que no reclama su proyecto. |
| G5 | Una evidencia con `project_id == null` (`unassigned`, §3) **no puede** aparecer en ningún `claim.evidence_ids`. Un evento sin proyecto no sostiene ninguna afirmación. |
| G6 | La relación inversa `Project → Claims` **no se persiste en ningún artefacto**, ni en el Registry ni en el feed. Se computa en el consumidor filtrando `claims` por `project_ids`. |

G4 y G5 son las que hacían falta: sin ellas, `claim.project_ids`, `claim.evidence_ids` y `evidence.project_id` podían apuntar a tres sitios distintos sin que nada fallara.

### Las tres dimensiones

La marca tiene tres dimensiones y **no son excluyentes**:

| Dimensión | Qué abarca |
|---|---|
| `build` | Sistemas, productos, software, IA, automatización, laboratorios y proyectos que construyo |
| `lead` | Arquitectura, liderazgo tecnológico, estrategia, CTO, producto y ejecución |
| `teach` | Docencia, currícula, educación y transferencia de conocimiento |

**Proof of Work demuestra principalmente `build`**, porque es la dimensión donde existe evidencia recolectable y verificable por terceros. Eso no borra `lead` ni `teach`: sus claims existen en el modelo, y se muestran con la procedencia y verificabilidad que realmente tienen. En V1 eso es `declared` / `unverifiable`, porque la única fuente es `github` y no produce evidencia de liderazgo ni de docencia (§1.1, §6).

Consecuencia honesta que hay que dejar visible en la UI: la dimensión con más evidencia no es la más importante, es la más instrumentable. Un claim `lead` sin evidencia recolectable no vale menos; vale distinto, y el par de etiquetas es lo que hace legible esa diferencia sin jerarquizarla.

### Invariantes de Claim

- `statement` lo escribe un humano. Si un proceso automático lo generó, no es un claim.
- `dimension` es requerida. No hay claim sin dimensión de marca.
- `provenance` y `verifiability` **no se declaran**: se derivan (§1.1). Declararlos hace fallar al validador.
- Ningún claim expresa competencia, calidad ni impacto. No hay campo donde ponerlo y no se añade uno (§7).
- Las seis reglas de integridad del grafo, G1–G6 (§1.2).

---

## 2. Project

**Un Project es una unidad de trabajo reclamada, con dueño, intención, ciclo de vida y frontera.**

Se **declara**. Nunca se infiere de la existencia de un repositorio.

Un repositorio es un *artefacto de* un proyecto, no el proyecto. Esta distinción es la que evita que el sistema degenere en un listado de repos:

- Un proyecto puede tener **varios** repos.
- Un repo puede alimentar **varios** proyectos.
- Un proyecto puede tener **cero** repos (una automatización operada en n8n, una intervención de consultoría, un curso). En V1 eso significa **cero registros de `Evidence`**, así que los claims que se apoyen solo en él derivan a `declared` / `unverifiable` (§1.1), y la interfaz lo dice explícitamente en lugar de disimularlo.

### Forma

```
Project
  id         slug estable, inmutable una vez publicado
  title
  thesis     qué problema resuelve, en una frase. No marketing.
  kind       qué tipo de trabajo es
  lifecycle  en qué estado de madurez está
  visibility qué puede publicarse
  context    bajo qué contexto se realizó
  nda        bool. Si true, implica visibility: confidential
  role       author | maintainer | contributor | reviewer | operator
  timeframe  { start, end? }
  sources[]  { type, ref, role: primary|component|infra|docs, period? }
```

`claims[]` **ya no vive aquí**: la relación la posee `Claim` mediante `project_ids[]` (§1). Un `claim_ids[]` en el proyecto sería una segunda fuente de verdad para la misma arista — y eso vale también para el feed publicado: la regla G6 (§1.2) prohíbe persistir el índice inverso **en cualquier artefacto**, no solo en el Registry. Se computa al renderizar.

### Cuatro dimensiones ortogonales

El modelo anterior tenía un solo campo `classification` que mezclaba naturaleza, madurez y contexto (`production` describía madurez, `internal_project` describía contexto, `lab` describía naturaleza). Eran inexpresables los casos reales, y quedan separados así:

**`kind` — qué tipo de trabajo es**

| Valor | Significa |
|---|---|
| `product` | Construido para terceros, con superficie propia e iteración |
| `tool` | Construido para ser usado por un conjunto conocido y pequeño; no es una oferta |
| `education` | Currícula, curso, taller, material didáctico |
| `lab` | Exploración estructurada, sin usuarios |
| `experiment` | Prueba de una hipótesis, desechable por diseño |

**`lifecycle` — estado y madurez**

`discovery` · `prototype` · `alpha` · `beta` · `production` · `maintenance` · `archived`

`production` significa que corre y se desarrolla activamente. `maintenance` significa que corre sin desarrollo activo. La distinción importa: la cadencia de releases solo se reporta en `production` y `maintenance`, y en `archived` la ausencia de releases es información correcta, no una señal negativa.

**`visibility` — qué puede publicarse**

`public` · `private` · `confidential`

**`context` — bajo qué contexto se realizó**

`personal` · `rbloomdev` · `inadaptados` · `client`

### Validación de solapamiento

Verificado dimensión contra dimensión. Un cambio respecto de la propuesta inicial:

| Par | ¿Se solapan? |
|---|---|
| `kind` × `lifecycle` | No. Un `lab` puede estar en `prototype` o en `archived`. |
| `kind` × `context` | **Sí se solapaban.** `client_project` describe *para quién*, que es exactamente `context: client`, no la naturaleza del trabajo. Un proyecto de cliente puede ser un `product`, una `tool` o una integración operada. **`client_project` se elimina de `kind`**, y `internal_tool` se renombra a `tool` porque el prefijo "internal" también codificaba contexto. Un sistema de automatización operado para un cliente es `kind: tool`, `context: client`, `lifecycle: production`. |
| `kind` × `visibility` | No. Un `product` puede ser público o confidencial. |
| `lifecycle` × `visibility` | No. Algo en `production` puede ser confidencial. |
| `lifecycle` × `context` | No. |
| `visibility` × `context` | No. `context: client` no implica confidencialidad: un proyecto de cliente puede ser open source. |
| `visibility` × `nda` | **Jerárquicos, no ortogonales, y es deliberado.** `visibility` es una regla de publicación; `nda` es un hecho legal. `nda: true` **implica** `visibility: confidential`, y el validador lo impone. No son redundantes: hay material confidencial sin NDA firmado. |

`kind` queda en cinco valores. `education` como `kind` es independiente de `dimension: teach` en `Claim`: un curso puede sostener un claim `teach` (lo enseñé) y otro `build` (construí la plataforma). Esa es la razón por la que la dimensión vive en `Claim` y no en `Project`.

### Combinaciones inválidas

No se resuelven fusionando dimensiones, sino rechazándolas en el validador:

- `kind: experiment` con `lifecycle: production` o `maintenance`. Un experimento que entró en producción dejó de ser un experimento: hay que reclasificarlo.
- `nda: true` con `visibility` distinto de `confidential`.
- `context: client` **es válido con cualquier `visibility`**, pero publicar algo de un proyecto de cliente exige un `release` humano registrado, y eso vale también cuando la visibilidad es `private`: el contexto de cliente es lo que hace atribuible al agregado. Ver `03-privacy-and-publication-policy.md` §2.
- `visibility: confidential` no admite publicación de ningún tipo sin `release`. El default es ausencia total del feed, no un registro redactado.

### Qué gobierna qué se puede afirmar

Al eliminarse `Claim.kind` (§1), la admisibilidad ya no se comprueba contra una taxonomía de afirmaciones. Queda repartida así, y la distinción entre las dos filas es la parte importante:

**Mecánico, lo impone el validador:**

- `kind: experiment` con `lifecycle: production` o `maintenance` es inválido (§2, combinaciones inválidas).
- La cadencia de releases solo se reporta en `lifecycle: production` o `maintenance` (§7).
- G1–G6 (§1.2): un claim solo se apoya en proyectos que reclama y en evidencia asignada.

**Regla de presentación, la comprueba el Reviewer, no el schema:**

- Ninguna afirmación se presenta como *operativa* o *fiable* si su evidencia derivada no incluye un registro `kind: deployment` o `check_run` en un proyecto con `lifecycle` en `production` o `maintenance`. Un laboratorio no afirma fiabilidad.

Esto es una **pérdida deliberada de mecanicidad** respecto del modelo anterior: `Claim.kind: operation` permitía comprobarlo en el validador, a cambio de sostener una taxonomía obligatoria sin más consumidor que esa única regla. Se prefiere una regla honesta y revisada a una taxonomía inventada para poder automatizarla. Si reaparece la necesidad mecánica, se resuelve con un ADR y un campo con un solo eje, no reintroduciendo los seis valores.

Y una regla que no cambia: un `experiment` con resultado negativo sigue siendo evidencia válida. Los experimentos fallidos no se borran; borrarlos sería la mentira.

---

## 3. Correlación: múltiples repos, un proyecto

El **Registry es el único dueño del mapeo**. Nada se adivina.

```
project.sources[] = [
  { type: "github_repo", ref: "owner/name", role: "primary" },
  { type: "github_repo", ref: "owner/shared-lib", role: "component", period: {...} },
  { type: "deployment_target", ref: "vercel:project-id", role: "infra" }
]
```

### Resolución de un evento a un proyecto

Orden estricto de precedencia. El primero que aplica gana:

1. **Trailer explícito** `Project-Id: <slug>` en el mensaje del commit o en el cuerpo del PR.
2. **Glob de paths** declarado en el Registry (para monorepos: `apps/web/**` a proyecto A).
3. **Repo por defecto** (`sources[].role == "primary"` y el evento cae dentro de `period`).
4. **`unassigned`**.

### `unassigned` es un estado de primera clase

Un evento sin proyecto **no se descarta y no se adivina**. Va al bucket `unassigned`, que se reporta internamente en cada corrida. Un `unassigned` creciendo es la señal de que al Registry le falta una entrada: es un dato de salud del sistema, no un error a silenciar.

**Nunca** se infiere el proyecto por similitud de nombre, por lenguaje, ni por heurística de contenido. Adivinar aquí contamina la evidencia en su origen.

---

## 4. Evidence

**Una Evidence es una observación inmutable, fechada y atribuible sobre un artefacto.**

Inmutable: una vez registrada no se edita. Si estaba mal, se registra una corrección y ambas quedan en la historia.

### Dos ejes, no cinco tipos

Ver `decisions/0004`. El planteamiento original enumeraba cinco clases de evidencia; en realidad son **dos ejes ortogonales**, y separarlos es lo que hace honesto al sistema: se puede recolectar automáticamente algo que ningún tercero puede comprobar.

**Eje A — Procedencia** (cómo obtuvimos el dato):

| Valor | Significa |
|---|---|
| `declared` | Un humano lo afirmó |
| `collected` | Se leyó de la API de una fuente |
| `derived` | Se computó a partir de datos `collected` |
| `correlated` | Se obtuvo uniendo fuentes o entidades distintas |
| `attested` | Un tercero identificado lo afirma |

**Eje B — Verificabilidad** (si alguien más puede comprobarlo):

| Valor | Significa |
|---|---|
| `unverifiable` | Solo nosotros lo vimos |
| `self_link` | Enlaza a algo que nosotros mismos alojamos |
| `third_party_public` | Cualquiera puede abrir la URL y comprobarlo |
| `cryptographic` | Firma o attestation comprobable sin confiar en nadie |

**La combinación es la información:**

| Hecho | Procedencia | Verificabilidad |
|---|---|---|
| Tag `v1.2.0` firmado en repo público | `collected` | `cryptographic` |
| PR mergeado en repo público | `collected` | `third_party_public` |
| 14 PRs en un repo privado | `collected` | `unverifiable` |
| "Opero esto en producción desde 2024" | `declared` | `unverifiable` |
| Lo anterior, con referencia del cliente | `attested` | `self_link` |

### Forma

```
Evidence
  id            = hash(source, source_event_id, kind)   → ingestión idempotente
  project_id?   null si unassigned
  source        github | ... (extensible)
  source_event_id
  kind          commit | pull_request | review | release | tag | check_run | deployment
  occurred_at   cuándo pasó en el mundo
  observed_at   cuándo lo vimos nosotros
  subject       { repo?, pr?, commit?, release?, deployment?, check_run? }
  actor_role    author | reviewer | approver | operator
  provenance, verifiability
  public_url?   presente solo si verifiability es third_party_public o cryptographic
  digest        hash del payload normalizado
  visibility    public | private | confidential
  redactions[]  qué campos se removieron y por qué
```

**`Evidence` es la autoridad única sobre `provenance` y `verifiability`.** Aquí se observan; en `Claim` se derivan (§1.1). No hay ningún otro lugar del modelo donde estos dos valores se declaren.

`id` content-addressed significa que **reingestar es idempotente**: la misma observación produce el mismo id y no duplica.

`occurred_at` y `observed_at` son distintos a propósito. Si una corrida falla y se recupera tres días después, eso queda visible en lugar de fingir tiempo real.

---

## 5. Source

Una **Source** es un sistema del que se recolecta evidencia. En V1 hay exactamente una: `github`.

Source es el **final** de la cadena, no su origen. Nunca determina qué se mide: eso lo decide el `Claim`. Añadir una fuente amplía la evidencia disponible; no crea afirmaciones nuevas ni métricas nuevas.

Una fuente aporta: un identificador estable de evento, un timestamp, un rol del actor, y opcionalmente una URL pública. Si no puede aportar los tres primeros, no es una fuente utilizable.

---

## 6. Verificable vs declarable

### Verificable por un tercero, sin confiar en nosotros

- URLs públicas de commits, PRs, reviews, releases y tags
- Commits y tags firmados (GPG, SSH, sigstore)
- Check runs y estados de CI en repos públicos
- URLs de deployment accesibles
- Autoría y fechas confirmadas por la API de GitHub
- Attestations SLSA o sigstore, cuando existan

### Solo declarable

- Impacto de negocio
- Trabajo de cliente privado o bajo NDA
- Criterio y rationale de diseño: *por qué* se decidió algo
- Seniority, autonomía, nivel de responsabilidad
- "Operado 18 meses en producción" sin status page pública
- Resultados de aprendizaje
- La mayor parte de la dimensión `lead`

### Intermedio: `attested`

Un tercero identificado (cliente, colega, institución) afirma algo. Más fuerte que `declared` porque hay un nombre detrás; más débil que `third_party_public` porque hay que confiar en ese nombre. Una atestiguación anónima es `declared`.

**En V1 no se produce.** El valor pertenece al eje de procedencia (`decisions/0004`) y describe correctamente una clase de hecho, pero la única `Source` de V1 es `github` (§5) y sus siete `kind` de evento son todos `collected`. No existe en V1 ninguna vía por la que una atestiguación entre al modelo, y por eso tampoco existe el campo `attestor` (§1.1): cuando exista la fuente, el atestiguador vivirá en el registro de `Evidence` que lo produzca. Declarar hoy el campo sería contrato anticipado sin productor (§8).

**Regla:** nunca se presenta lo declarable con la estética de lo verificable. Sin insignias de check, sin barras de progreso, sin colores de "validado" en claims `unverifiable`.

---

## 7. Anti-vanity

### Tres clases de número, y solo una es una métrica

La regla anterior decía «una métrica que no está adherida a un Claim no se publica» y el propio contrato del feed la contradecía: `meta.counts` y `meta.unassigned_events` son contadores publicados que no penden de ningún claim. La contradicción no estaba en el contrato, estaba en la regla: usaba «métrica» para tres cosas distintas. Quedan separadas, y la clase determina qué se le exige a cada número:

| Clase | Qué es | Exige `claim_ids` | Ejemplos |
|---|---|---|---|
| **Métrica de evidencia** | Una afirmación cuantificada sobre el sujeto del portafolio | **Sí, requerido y no vacío** | buckets de `activity.json`, densidad de evidencia, cobertura de claims, continuidad, cadencia de releases, latencia de fix |
| **Metadata operativa** | Salud y completitud del sistema que produce la evidencia. No dice nada sobre la persona | No | `unassigned_events`, `source_coverage`, `last_success_at`, `engine_version`, `generated_at` |
| **Metadata de presentación** | Cardinalidad e integridad del propio artefacto, para poder renderizarlo y verificarlo | No | `counts.{projects,claims,evidence}`, `digest`, `schema_version` |

### La regla formal

> **Una métrica de evidencia que no está adherida a un Claim no se publica.**

No es una guía de estilo: es la consecuencia de la dirección de la cadena (§0). Una métrica de evidencia es evidencia agregada **adherida a un `claim_id`**. Sin ese campo no existe el registro, así que no hay dónde alojar un número huérfano.

Y la contrapartida, que es lo que impide que «metadata operativa» se convierta en la puerta de atrás del vanity:

- **Ninguna de las dos clases sin `claim_ids` puede presentarse como logro.** Ni ordenada, ni comparada contra un periodo anterior, ni con flecha de tendencia, ni destacada tipográficamente. Se renderizan como lo que son: estado del sistema y tamaño del archivo.
- **Una clase no se recalifica para poder publicar un número.** Si un contador dice algo sobre el sujeto, es métrica de evidencia y necesita claim, se llame como se llame. Reetiquetar es la vía por la que esto se rompería, y es la que el Reviewer debe buscar.
- `unassigned_events` se publica precisamente porque es una mala noticia sobre el sistema: no hay incentivo para inflarlo (§3).

### Lo que las métricas no son

Ninguna cantidad de telemetría se convierte en una afirmación de experiencia:

- los commits no equivalen a expertise;
- las líneas de código no equivalen a habilidad;
- los tokens no equivalen a productividad;
- las sesiones de IA no equivalen a experiencia;
- las tool calls no equivalen a calidad.

Las métricas **complementan** la evidencia de un claim. Jamás la sustituyen ni se convierten por sí mismas en el claim.

### Prohibido en el schema

Estos campos no existen y añadirlos requiere cambiar `00-product-brief.md` primero:

conteo de commits como habilidad · líneas de código · streaks · stars · forks · followers · tokens consumidos · prompts · sesiones de agente · tool calls · "horas codeando" · porcentajes de lenguaje · porcentajes o niveles de experiencia · score · rank

### Permitido

Todo lo siguiente es falsable y va adherido a un claim:

| Métrica | Qué es realmente |
|---|---|
| Densidad de evidencia por claim | ¿Tiene al menos un artefacto verificable por tercero? Sí o no |
| Cobertura de claims | % de claims con evidencia `third_party_public` o superior |
| Continuidad longitudinal | Duración con actividad, en meses. Un hecho, no un puntaje |
| Participación en reviews | Que otros revisaron mi código, o yo el de otros. Hecho de colaboración |
| Cadencia de releases | Solo en `lifecycle: production` o `maintenance` |
| Latencia de fix | Solo donde exista dato de CI que lo sostenga |

Ninguna se agrega en un número global. No existe un número que resuma a una persona.

---

## 8. Extensión futura: Claude Code, Codex y otros (no en V1)

**No hay ningún campo de asistencia en V1.** Existía uno (`Evidence.assistance`), definido y documentado pero explícitamente fuera de alcance: contrato anticipado sin consumidor, que es la forma más barata de que un modelo se equivoque temprano y quede atado a la equivocación. Se elimina.

Lo que queda son **tres restricciones de diseño** que gobernarán ese campo cuando exista. No son contrato: son la decisión ya tomada sobre su forma, para que V2 no la vuelva a discutir.

1. **El proveedor será un valor, no un tipo.** Un `provider_id` string (`"claude-code"`, `"codex"`, cualquiera). Sin tipos, tablas ni ramas de código por proveedor en el dominio. Los adaptadores viven en `ingest/sources/<provider>/` y todos producen la misma forma `Evidence`.

2. **Se registrará el vínculo, no el contenido.** La evidencia es *"esta sesión asistida contribuyó a este PR mergeado"*. Nunca el prompt, nunca la transcripción, nunca el diff generado, nunca el conteo de tokens ni de tool calls. Sin excepción y sin campo donde ponerlos: esos siguen prohibidos en §7 hoy y en V2.

3. **Será una anotación de procedencia, no una métrica de productividad.** Es divulgación: declara *cómo* se produjo el trabajo. Que un PR fuera asistido no lo hace mejor ni peor, y el sistema no debe insinuar ninguna de las dos cosas. En particular, no es una métrica de evidencia y no se agrega (§7).

Por qué no hace falta reservar el campo: la regla 2 del contrato del feed (`05-feed-contract.md`) dice que **añadir un campo opcional es un cambio compatible dentro de una versión**. Incorporar asistencia en V2 será aditivo por construcción, así que declararlo hoy no compra compatibilidad — solo congela una forma que nadie ha implementado todavía.
