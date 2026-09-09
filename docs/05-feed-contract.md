# 05 — Contrato del Feed Público (v1)

> Documento **normativo y autoridad única** del contrato. El schema ejecutable (`public/proof/schemas/*.json`, Sprint 1) y el código que lo consume son **derivados** de aquí.
> Cuando prosa y schema discrepen, **el schema está mal**. La divergencia es un defecto del derivado, no deuda de la prosa: se corrige el schema. Un artefacto que valida contra un schema divergente da CI verde midiendo la cosa equivocada, que es peor que fallar. **Divergencia = FAIL, no deuda.**
> Cambiar este contrato lo decide Rodrigo (ver `03-privacy-and-publication-policy.md` §7).

---

## Ubicación y forma

```
public/proof/
  v1/
    meta.json        estado de la publicación
    claims.json      afirmaciones declaradas   ← raíz del grafo
    projects.json    proyectos que las sostienen
    evidence.json    registros de evidencia publicables
    activity.json    agregados temporales      (V1.1)
  schemas/
    *.json           JSON Schema de cada archivo (Sprint 1)
```

Servidos como estáticos en `https://www.rodrigobermejo.com/proof/v1/*.json`. Mismo origen, sin CORS, rastreables a propósito: un feed que no se puede leer no es verificable.

## Reglas del contrato

1. **Versionado por directorio.** `v1/` es inmutable en su forma. Un cambio incompatible crea `v2/` y `v1/` sigue existiendo hasta que ningún consumidor lo use.
2. **Aditivo dentro de una versión.** Añadir un campo opcional es compatible. Renombrar, eliminar o cambiar el tipo de un campo, no lo es.
3. **Un consumidor debe ignorar campos que no conoce.** Nunca fallar por un campo extra.
4. **El sitio falla el build si el feed no valida.** Datos que no cumplen el contrato no se renderizan.
5. **El sitio no falla si el feed no existe**, pero tampoco inventa contenido. Renderiza una superficie editorial **sin afirmaciones**.

> **Corregido el 2026-08-28 (`decisions/0011`).** La regla 5 decía «renderiza la vista
> solo-declarada», y eso es **lógicamente imposible**: las declaraciones viven en
> `claims.json`. Sin feed no hay claims que mostrar, salvo duplicándolos en el código del
> sitio — que crearía una segunda fuente de verdad, exactamente lo que este contrato
> existe para evitar. «Sin evidencia» y «sin feed» son estados distintos y la regla los
> confundía:
>
> | Estado | Build | Qué se muestra |
> |---|---|---|
> | Feed válido con `evidence: []` | verde | Todo: claims, proyectos, y el límite de comprobación |
> | Feed **completamente** ausente | verde | Superficie editorial sin afirmaciones |
> | Cualquier otra cosa — ausencia parcial, 0 bytes, JSON roto, `counts` que no cuadra | **rojo** | Nada |
>
> «Ausente» significa **solo `ENOENT` sobre `v1/meta.json`**. Cualquier otro error se
> relanza: capturar todo fallo de lectura como «ausente» convertiría un JSON corrupto o un
> feed a medio escribir en un build verde indistinguible del estado legítimo.

### Nota sobre las eliminaciones del 2026-08-21

La regla 2 prohíbe eliminar campos dentro de una versión, y esta revisión elimina cinco (`claims.kind`, `claims.attestor`, `projects.claim_ids`, `projects.evidence_summary`, `evidence.assistance`). No es una violación: **`v1/` no se ha publicado todavía** — `public/proof/` no existe en el repo y el primer artefacto llega en Sprint 4. No hay ningún consumidor al que romper.

La regla 2 empieza a aplicar en el momento en que el primer PR de publicación se mergea. Después de eso, estas mismas eliminaciones habrían requerido `v2/`, y por eso se hacen ahora. Origen: review adversarial de Codex sobre Sprint 0.

---

## `meta.json`

Siempre presente si existe cualquier otro archivo. Es lo primero que lee el sitio.

```
{
  schema_version: "1.0.0",
  generated_at:   ISO-8601 UTC,        // se muestra SIEMPRE en la UI
  engine_version: string,
  source_coverage: [
    { source: "github", repos_public: int, repos_private: int, last_success_at: ISO }
  ],
  counts:   { projects: int, claims: int, evidence: int },   // metadata de PRESENTACIÓN
  unassigned_events: int,              // metadata OPERATIVA, publicada a propósito
  digest:  string                      // hash de los otros archivos de v1/
}
```

Ningún campo de `meta.json` es una **métrica de evidencia**, y por eso ninguno lleva `claim_ids`. Las tres clases de número están definidas en `02-domain-and-evidence-model.md` §7:

- `counts` y `digest` son **metadata de presentación**: cardinalidad e integridad del propio artefacto. Dicen cuántos registros hay en el archivo, no cuánto trabaja nadie.
- `unassigned_events`, `source_coverage`, `last_success_at`, `generated_at` y `engine_version` son **metadata operativa**: salud del sistema que produce la evidencia.

Ninguno de los dos grupos puede renderizarse como logro: sin orden descendente, sin comparación contra el periodo anterior, sin flecha de tendencia, sin destacado tipográfico. `unassigned_events` se publica deliberadamente porque es honestidad sobre la completitud del sistema — y funciona precisamente porque es una mala noticia: nadie tiene incentivo para inflarlo.

## `projects.json`

```
{
  schema_version, projects: [{
    id, title, thesis,
    kind:       product|tool|education|lab|experiment,
    lifecycle:  discovery|prototype|alpha|beta|production|maintenance|archived,
    visibility: public|private,        // `confidential` NUNCA aparece aquí
    context:    personal|rbloomdev|inadaptados|client,
    role:       author|maintainer|contributor|reviewer|operator,
    timeframe:  { start: YYYY-MM-DD, end?: YYYY-MM-DD },   // fechas, NO instantes
    public_sources: [{ type, url }],   // derivado de sources[].public — NUNCA de visibility
    has_private_sources: bool          // el HECHO se publica; la identidad no
  }]
}
```

Las cuatro dimensiones sustituyen al antiguo campo único `classification`, que mezclaba naturaleza, madurez y contexto. Ver `02-domain-and-evidence-model.md` §2 y `decisions/0006`.

### De dónde salen `public_sources` y `has_private_sources`

Los dos se **derivan** de `sources[].public` del Registry (`02` §3), que es un campo
declarado y requerido en cada fuente:

```
public_sources      = sources.filter(s => s.public).map(s => ({ type, url }))
has_private_sources = sources.some(s => !s.public)
```

**No se derivan de `project.visibility`.** Un proyecto público puede apoyarse en un repo
privado —`proof-of-work` lo hace— y esa inferencia publicaría la URL de un repo privado
con el schema en verde, violando `03` §2. La derivación desde `visibility` no está
prohibida por disciplina: es que `sources[].public` existe para que no haga falta.

`timeframe.start` y `timeframe.end` son **fechas, no instantes**: el periodo de un proyecto
es un rango de días. El schema lo impone con `pattern`, no solo con `format`, porque
`format` en JSON Schema es una anotación y no comprueba nada por sí solo
(`decisions/0011`).

### Un proyecto `confidential` no tiene registro en el feed

`visibility: confidential` (y por implicación todo `nda: true`) significa **ausencia total del artefacto público**: sin `id`, sin `title`, sin `thesis`, sin `timeframe`, sin `context`, sin conteos y sin buckets de actividad. No es un registro redactado: es un registro que no existe.

La razón es que la redacción campo a campo no funcionaba aquí. La combinación `title` + `thesis` + `context: client` + `timeframe` + `has_private_sources` + conteos + actividad temporal reidentifica al cliente aunque cada campo por separado parezca inocuo, y el umbral k no lo evitaba porque cuenta eventos y no sujetos (`03-privacy-and-publication-policy.md` §3).

Publicar cualquier cosa sobre un proyecto `confidential` exige una **liberación humana explícita registrada en el Registry** (`release`, ver `03` §2). El default es cerrado y no hay bypass en código.

Que existe trabajo no mostrado se dice en la prosa de `/evidencia`, que es texto editorial, no un campo del feed. Un contador de proyectos ocultos volvería a ser un dato atribuible en cuanto el conjunto fuera pequeño.

### Campos derivados que ya no se persisten

Dos campos desaparecen de `projects.json` por la misma razón: eran relaciones y agregados que el consumidor puede computar, y persistirlos creaba una segunda fuente de verdad que podía discrepar sin que nada fallara.

| Campo eliminado | Por qué | Cómo se obtiene ahora |
|---|---|---|
| `claim_ids` | La arista la posee `claims[].project_ids`. Regla G6 de `02` §1.2: el índice inverso no se persiste **en ningún artefacto** | `claims.filter(c => c.project_ids.includes(p.id))` al renderizar |
| `evidence_summary` | Todo lo que se pudiera computar desde `evidence.json` es redundante; todo lo que **no** se pudiera computar desde ahí sería un conteo atribuible sobre evidencia privada, prohibido por §3 de `03` | Contando `evidence[]` por `verifiability` al renderizar |

`nda` **no se publica**. Es un hecho legal interno; lo que el feed expone es su consecuencia: el proyecto no aparece.

`has_private_sources: true` sin nombrar nada es la forma correcta de decir "hay más trabajo del que se puede mostrar" **para un proyecto `public` o `private` que sí se publica**. Para uno `confidential` no aplica: no hay registro donde ponerlo.

## `claims.json`

El archivo central. Aquí vive el invariante del sistema.

```
{
  schema_version, claims: [{
    id,
    statement:   string,         // DECLARADO: escrito por un humano, nunca generado
    dimension:   build|lead|teach,
    project_ids: [string],       // uno o varios: muchos-a-muchos
    evidence_ids: [string],
    provenance:    declared|collected|derived|correlated,   // DERIVADO
    verifiability: unverifiable|self_link|third_party_public|cryptographic  // DERIVADO
  }]
}
```

`project_ids` es plural y es el cambio estructural respecto de la versión anterior: una afirmación como "construyo sistemas de IA usados en contextos reales" se apoya en varios proyectos y en ninguno en particular. Ver `decisions/0007`.

### Qué se declara y qué se deriva

`provenance` y `verifiability` aparecen en `claims.json` pero **no se declaran en ningún sitio**: el motor los computa desde `evidence_ids` con la función de `02-domain-and-evidence-model.md` §1.1. `Evidence` es la autoridad única sobre ambos. Antes se declaraban también en el `Claim`, y eso permitía que un claim afirmara `third_party_public` mientras su evidencia era `unverifiable` sin que nada fallara.

Dos campos desaparecen:

| Campo eliminado | Por qué |
|---|---|
| `kind` | Obligatorio y sin consumidor mecánico real; sus seis valores mezclaban ejes distintos. Ver `02` §1 y la enmienda de `decisions/0007` |
| `attestor` | Solo tenía sentido con `provenance: attested`, y en V1 ninguna fuente produce evidencia `attested`. Ver `02` §1.1 y §6 |

Por eso el enum publicado de `provenance` **no incluye `attested`**: no es que esté prohibido, es que la derivación no puede producirlo mientras `github` sea la única fuente. Cuando exista una fuente que lo produzca, añadir el valor es un cambio de contrato que decide Rodrigo.

### Invariantes que el schema debe imponer

No son convenciones de UI:

- `statement` y `dimension` son **requeridos**. Un claim sin dimensión de marca no valida.
- `provenance` y `verifiability` son requeridos **en el artefacto** y prohibidos **en el Registry**. Si aparecen como entrada declarada, el validador falla.
- Ningún claim expresa competencia, calidad ni impacto: no existe el campo (`00-product-brief.md`, postura epistémica).
- Las seis reglas de integridad del grafo, **G1–G6** de `02` §1.2, evaluadas sobre el artefacto publicado: `project_ids` no vacío, referencias existentes, `evidence.project_id ∈ claim.project_ids`, sin evidencia `unassigned`, y sin índice inverso persistido.
- «Si `verifiability != unverifiable` hay al menos una evidencia con `public_url`» ya no se impone: es consecuencia de la derivación (`02` §1.1). El schema lo puede comprobar como aserción redundante, y si falla, el motor tiene un bug.

### Claims que tocan un proyecto que no se publica

> **Corregido el 2026-08-28 (`decisions/0011`).** Esta sección decía «proyectos
> `confidential`», y eso dejaba fuera el caso que de verdad se da hoy. `docencia-isc-upa`
> es `visibility: public`, `nda: false`, `context: client`, `publish: none`: **no es
> `confidential`**, así que una implementación fiel a la regla anterior lo omitía de
> `projects.json` y a la vez **dejaba su id dentro de `claims.json`**. Ese id nombra a la
> institución cliente, y `publish: none` existe precisamente para que no salga «en ninguna
> forma». La clave correcta no es la confidencialidad: es la **publicabilidad**.

Un claim puede apoyarse en proyectos de visibilidad distinta. Al publicar:

1. Se **elimina** de `project_ids` todo proyecto que **no aparezca en `projects.json`**, sea cual sea la razón: `visibility: confidential`, `publish: none`, o `context: client` sin `release` que lo cubra. No aparecen ni como id opaco.
2. La evidencia de esos proyectos no entra en `evidence_ids`, porque no entra en `evidence.json`.
3. Si tras el filtro `project_ids` queda vacío, **el claim no se publica**: G1 se evalúa sobre el artefacto, no sobre el Registry. Un claim sostenido solo por trabajo que no se publica no tiene forma pública honesta.
4. `provenance` y `verifiability` se derivan de la evidencia **publicada**, no de la total. Un claim no puede acreditar verificabilidad con evidencia que nadie puede abrir.

**El orden importa y es este**, porque cada paso consume la salida del anterior:

```
1. decidir proyectos publicables      →  projects.json
2. filtrar evidencia a esos proyectos →  evidence.json
3. recortar claim.project_ids
4. recortar claim.evidence_ids
5. descartar claims que quedaron vacios
6. DERIVAR provenance y verifiability sobre lo que sobrevivio
7. recalcular meta.counts y meta.digest
```

Derivar antes de recortar (pasos 6 y 3 invertidos) produce un claim que acredita
verificabilidad con evidencia que ya no está en el artefacto. Es el defecto que la regla
de `02` §1.1 existe para impedir, y el orden es la única cosa que lo impide de verdad.

**Un claim recortado no dice que lo han recortado.** No hay campo, ni conteo, ni marca:
un «2 proyectos ocultos» sería un dato atribuible en cuanto el conjunto fuera pequeño, por
la misma razón que no existe el contador de proyectos confidenciales. Que existe trabajo
no mostrado se dice **una vez**, en la prosa de `/evidencia`.

## `evidence.json`

Solo registros publicables. Los `private` no aparecen aquí; se reflejan agregados en `activity.json`, sujetos a §3 de `03`. Los `confidential` no se reflejan en ninguna parte.

```
{
  schema_version, evidence: [{
    id, project_id,              // requerido y no null: ver G5 en `02` §1.2
    source: "github",
    kind: commit|pull_request|review|release|tag|check_run|deployment,
    occurred_at: ISO,
    actor_role:  author|reviewer|approver|operator,
    provenance, verifiability,   // AUTORIDAD: aquí se observan, en claims se derivan
    public_url?,                 // requerido si verifiability es third_party_public|cryptographic
    signed?: bool
  }]
}
```

Este archivo es la **autoridad** sobre `provenance` y `verifiability`. `claims.json` los deriva de aquí y no puede contradecirlos (`02` §1.1).

`project_id` es requerido y no puede ser null en el artefacto publicado: un evento `unassigned` no sostiene ninguna afirmación y no se publica (G5). Su existencia se refleja en `meta.unassigned_events`, que es metadata operativa.

`assistance` **ya no existe en el contrato**. Estaba documentado como "reservado, ausente en V1": un campo definido para un consumidor que no existe. Se elimina. Añadirlo en V2 será un cambio aditivo, que la regla 2 del contrato ya declara compatible — reservarlo hoy no compraba nada y congelaba una forma sin implementar. Ver `02-domain-and-evidence-model.md` §8.

## `activity.json` (V1.1)

Agregados temporales. Mensual como grano mínimo; nunca diario para fuentes privadas.

```
{
  schema_version, buckets: [{
    period: "2026-03",           // mes o trimestre
    claim_ids: [string],         // REQUERIDO, no vacío: qué afirmación sostiene
    project_id?,                 // ausente = agregado sobre todos los proyectos del claim
    counts: { commits, pull_requests, reviews, releases, deployments },
                                 // enteros exactos. NO hay representacion de rango
                                 // en V1, y es deliberado. Leer las reglas de
                                 // privacidad del bucket: hay buckets que por eso
                                 // no existen
    visibility_scope: public|mixed    // "mixed" exige las reglas de abajo
  }]
}
```

**`claim_ids` es requerido y no puede estar vacío.** Un bucket de actividad *es* una **métrica de evidencia** en el sentido de `02-domain-and-evidence-model.md` §7 — dice algo cuantificado sobre el sujeto — y por tanto no se publica sin claim. No hay agregado global: un contador que no sostiene ninguna afirmación es precisamente el dashboard vanity que el sistema existe para no construir. Esta exigencia **no** aplica a `meta.json`, cuyos contadores son metadata operativa y de presentación, no métricas de evidencia; la separación de clases está en §7 y es lo que hace que la regla sea consistente en lugar de contradecirse dentro del propio contrato.

Consecuencia práctica y deseada: si un mes de actividad no sostiene ninguna afirmación, no se publica. La actividad no es el producto.

### Reglas de privacidad del bucket

**La autoridad es `03-privacy-and-publication-policy.md` §3, y ahí son ocho reglas, no tres.** Esta sección enumeraba tres y las presentaba como el conjunto completo, y eso abría una contradicción real: se leía la regla 7 de `03` §3 como una *obligación de publicar un rango* entre 5 y 10 eventos, mientras este contrato declara `counts` como enteros. Un bucket privado de 7 eventos no podía cumplir los dos documentos a la vez, y una contradicción entre el contrato y la política de privacidad no es deuda: es FAIL (finding P0-PRIV-02 del review de Codex).

**Resuelto el 2026-08-24 por decisión de Rodrigo** (`03` §3.1): la regla 7 es un **techo de divulgación** —nunca el número exacto— y no un mandato de publicar un rango. La omisión respeta el techo, así que no hay contradicción que arrastrar.

Las tres que dan forma al bucket, en conjunto y sin que ninguna sustituya a las otras:

1. **Nada `confidential`.** Ningún evento con procedencia en un proyecto `confidential` entra en un bucket, ni siquiera agregado. No hay umbral que lo habilite.
2. **Sujetos independientes ≥ 2** para cualquier bucket que incluya eventos de fuente privada. Un bucket alimentado por un solo sujeto es atribuible por construcción, tenga 5 eventos o 500.
3. **Umbral k = 5 eventos** como piso mínimo, y nada más que eso. Un bucket bajo el umbral **se omite**, no se rellena con ceros: un cero implicaría "no hubo trabajo", que sería falso.

Y la cuarta, que es la que aterriza el techo de divulgación de la regla 7:

> **Un bucket que caiga en la banda de la regla 7 de `03` §3 no se publica.** Entre 5 y 10 eventos de procedencia privada está prohibido el conteo exacto, y `counts` son enteros: este contrato no tiene cómo decir menos. Se **omite el bucket**, igual que se omite bajo el umbral.

**Esto es el comportamiento definitivo de V1, no un provisional.** No hay decisión pendiente ni deuda abierta detrás de esta regla: `03` §3.1 fija que la regla 7 prohíbe el número exacto y no obliga a publicar un rango, y la omisión respeta ese techo por completo.

Lo que sí sigue siendo una decisión humana es **cambiar el contrato**: un `counts` que admita rangos añadiría una representación nueva a la superficie pública, y eso escala a Rodrigo (`AGENTS.md` → *Escalar a un humano*: cambiar el schema del feed o publicar un campo o valor nuevo). Ningún agente decide la forma del contrato público. Mientras no exista esa decisión —y hoy no existe, ni hace falta para que V1 sea correcto— rige la omisión.

Consecuencia visible y aceptada: un bucket privado de 7 eventos **no aparece en el feed**. Igual que bajo el umbral, la ausencia no se rellena con ceros ni se anota: un cero afirmaría "no hubo trabajo", que sería falso, y una marca de "omitido aquí" reintroduciría por la puerta de atrás la señal que la regla 7 acota.

Las reglas 4, 5, 6 y 8 de `03` §3 —coarsening temporal, vocabulario controlado, sin URLs y sin cruces reidentificantes— aplican al bucket igual que las anteriores y no se reenumeran aquí a propósito: duplicar la lista es exactamente cómo aparecen dos autoridades para lo mismo. `03` es la autoridad; esta sección solo dice cómo aterrizan en `activity.json`.

`visibility_scope: mixed` solo es legal si se cumplen **todas**. El umbral k por sí solo **no anonimiza** — cuenta eventos, no sujetos — y el contrato no debe presentarlo como si lo hiciera.

---

## Prohibido en el contrato, permanentemente

Estos campos no existen y añadirlos requiere cambiar `00-product-brief.md` primero:

`commit_count` como habilidad · `lines_of_code` · `streak` · `stars` · `forks` · `followers`
`tokens_used` · `prompts` · `agent_sessions` · `tool_calls` · `hours` · `language_percentages`
`experience_level` · `score` · `rank`

Y una regla estructural, no una lista: **ninguna métrica de evidencia publicable puede existir sin `claim_ids`**.

La versión anterior de esta regla decía "ningún objeto publicable que contenga un contador", y era falsa dentro de este mismo documento: `meta.counts` y `meta.unassigned_events` son contadores publicados y correctos. Una regla que el propio contrato incumple no restringe nada, solo enseña a ignorarla. La formulación precisa exige clasificar primero (`02-domain-and-evidence-model.md` §7):

| Clase | `claim_ids` | Dónde vive hoy |
|---|---|---|
| Métrica de evidencia | **Requerido, no vacío** | `activity.json` |
| Metadata operativa | No | `meta.unassigned_events`, `meta.source_coverage` |
| Metadata de presentación | No | `meta.counts`, `meta.digest` |

El riesgo se traslada a la clasificación, y ahí es donde hay que vigilarlo: **reetiquetar una métrica de evidencia como metadata para poder publicarla sin claim es la única forma en que esta regla se rompe.** El Reviewer busca exactamente eso. Prueba: si el número dice algo sobre el sujeto del portafolio, es métrica de evidencia, se llame como se llame.

---

## Contrato de presentación

> Añadido el 2026-08-28 (`decisions/0011`). El contrato de datos decía qué se publica y
> qué está prohibido, y **no decía nada de cómo se muestra**. Eso dejaba las decisiones
> epistemológicas —qué color tiene un claim que nadie puede comprobar, si el par de
> etiquetas es un badge— en manos de quien implementara la página. Dos implementaciones
> igual de válidas contra el schema comunican verdades distintas, y eso es un fallo del
> contrato, no del implementador.

`02-domain-and-evidence-model.md` §6 dice qué está **prohibido**: nunca presentar lo
declarable con la estética de lo verificable, sin insignias de check, sin barras de
progreso, sin colores de «validado». Esta sección dice qué se hace **en su lugar**, porque
una prohibición sin forma positiva produce la salida por defecto de la industria: un chip
gris, un guion, un `0`, o un vacío con la palabra «Próximamente».

### El encuadre, que es la mitad del contrato

**La ausencia de evidencia no es un hueco: es el contenido.** `00-product-brief.md` define
el éxito como que el lector compruebe la afirmación **o entienda exactamente por qué no
puede comprobarla**. Esa segunda mitad es texto declarado por un humano. No es un estado
degradado a la espera de datos: es una de las dos formas en que el sistema funciona.

### Copy público de los dos ejes

Los términos técnicos son del contrato, no de la interfaz. La interfaz muestra la
traducción, y el término va en el `title` de un `<abbr>` y completo en `/evidencia`.

| `provenance` | Copy |
|---|---|
| `declared` | lo afirmo yo |
| `collected` | leído de la fuente |
| `derived` | calculado a partir de lo leído |
| `correlated` | unido entre fuentes |

| `verifiability` | Copy |
|---|---|
| `unverifiable` | no puedes comprobarlo sin confiar en mí |
| `self_link` | enlaza a algo que alojo yo |
| `third_party_public` | cualquiera puede abrirlo y comprobarlo |
| `cryptographic` | comprobable sin confiar en nadie |

**Los cuatro valores de cada eje se renderizan con el mismo peso, tamaño y color.** Sin
rampa cromática, sin orden implícito, sin iconos en ninguno. Una escala de color *es* un
puntaje aunque nadie lo llame así, y `00-product-brief.md` dice que estos ejes no son un
puntaje. La forma **no cambia** el día que aparezca un claim `third_party_public`: si
cambiara, el lector aprendería que la forma de hoy era la mala.

El par se renderiza como **una oración subordinada al pie del statement**, no como dos
etiquetas junto al título. Dos etiquetas junto a un título es la gramática de un badge de
`verified`, que es exactamente lo prohibido.

### Lo que acompaña siempre a un claim sin evidencia

Tres filas, en el lugar donde luego irá la lista de evidencia:

| Fila | Contenido |
|---|---|
| Quién lo afirma | La persona y la fecha del statement |
| Qué lo respaldaría | El `evidence_scope` en lenguaje humano. Es una promesa falsable: dice contra qué se le puede pedir cuentas |
| Por qué hoy no puedes comprobarlo | Una frase **declarada y específica de ese claim**, nunca una plantilla |

Sin iconos, sin color de estado, sin caja de alerta —un fondo ámbar con un triángulo lo
convierte en advertencia, o sea, en fracaso—. Con la misma tinta que el resto, porque
tiene el mismo estatus. Y **sin las palabras «todavía», «aún», «pronto» ni «en
construcción»**: la tercera fila explica una condición del mundo, no un retraso del
proyecto.

### Estados de lector

| Estado | Qué se muestra |
|---|---|
| Feed válido con `evidence: []` | Experiencia normal. No es un estado degradado |
| Feed completamente ausente | Superficie editorial **sin afirmaciones**. Los claims viven en `claims.json`; sin feed no hay claims que mostrar, y duplicarlos en el código crearía una segunda fuente de verdad |
| Proyecto sin ningún claim | Frase declarada que lo dice. Nunca una sección de claims vacía |
| Claim recortado | Nada. No se insinúa cuántos ni cuáles se quitaron |
| `has_private_sources: true` | Una línea en prosa. Es la forma correcta de decir «hay más trabajo del que se puede mostrar», y es señal de credibilidad, no de carencia |
| `meta.generated_at` | **Fecha absoluta, en prosa.** Nunca relativa: «hace 3 días» convierte la frescura en métrica y a los dos meses el sitio se autodenuncia como abandonado |
| `meta.counts` | **No se renderiza como cifras.** Si se menciona, va dentro de una oración. Una fila de cifras es el dashboard que este sistema existe para no ser |

**No hay estado de carga.** El sitio es estático y todo se resuelve en build. Un skeleton
aquí es una mentira sobre cómo funciona el sistema.

### Orden y agrupación

- **El índice canónico es la lista de afirmaciones**, no la de proyectos. La cadena del
  dominio es `Claim → Project → Evidence` (`02` §0), y una rejilla de proyectos como
  entrada la invierte: es `Source → Dashboard` con otro nombre.
- Los claims van en el **orden del Registry**, y la página lo dice. Cualquier otro orden se
  lee como ranking. Nunca por cantidad de proyectos ni de evidencia.
- `dimension` es una **etiqueta, no un filtro**. Un control que filtra un elemento por
  opción convierte la dimensión en un eje de comparación.
- Los proyectos que no sostienen ninguna afirmación **se muestran**, agrupados al final y
  rotulados por lo que son. Ocultarlos es menos creíble que nombrarlos.

### La frontera del funnel es de datos, no de navegación

`04-architecture.md` §4 invariante 4 prohíbe que el funnel comercial **importe** nada del
feed, y `guard:funnel` lo comprueba sobre el cierre transitivo de imports. Eso no prohíbe
enlazar: la navegación lleva a las rutas de evidencia con enlaces estáticos. Dejarlas sin
enlace haría la prueba de trabajo invisible justo para quien evalúa contratar.

### `meta.digest` no se presenta como integridad verificable

Lo computa el mismo proceso que escribe el archivo, sobre un Registry que nadie fuera puede
leer. Sirve para detectar corrupción en tránsito y se puede mostrar como tal. Presentarlo
como prueba de integridad sería la estética de validado que `02` §6 prohíbe. La
verificabilidad real llega con la firma de commits (Sprint 7).
