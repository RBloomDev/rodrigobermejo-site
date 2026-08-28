# ADR 0011 — Publicar lo declarado antes de ingerir

- **Estado:** Aceptada
- **Fecha:** 2026-08-28
- **Decidida por:** Rodrigo, en el gate de premisas de un `/autoplan`. Redactada y ejecutada por el agente bajo esa autorización.

## Contexto

`06-roadmap.md` ordenaba el trabajo así: ingestión (Sprint 2), correlación (3), publicación
(4), consumo en el sitio (5). La primera superficie que un humano puede abrir llegaba en el
Sprint 5, y el mismo documento afirmaba que «el valor se entrega desde el Sprint 1».

Esa afirmación era falsa el 2026-08-28. El Sprint 1 entregó un Registry en un repositorio
**privado**; `public/proof/` solo contenía schemas. Nadie fuera de este proyecto podía ver
nada, y los tres sprints siguientes tampoco publicaban.

El plan de ejecución del Sprint 2 se sometió a un review adversarial con dos modelos
independientes. Coincidieron en **seis de seis dimensiones estratégicas**, y el argumento
que ambos hicieron por separado es el que decide esta ADR:

> `00-product-brief.md` define el éxito como que el lector escéptico **compruebe la
> afirmación o entienda exactamente por qué no puede comprobarla**. La segunda mitad de esa
> frase no necesita motor de ingestión.

## El hallazgo que lo hace urgente, y no solo elegante

El Sprint 2 **completo y perfecto** produce esto:

| Claim | `evidence_scope` | Lo que vería el lector |
|---|---|---|
| `construyo-sistemas` (build) | `proof-of-work`, `habit-tracker` | commits en el repo que genera esta misma página, más un proyecto personal |
| `decido-arquitectura` (lead) | ninguno | `declared` / `unverifiable` — sin cambio |
| `ensino-y-mentoreo` (teach) | ninguno | `declared` / `unverifiable` — sin cambio |

Dos de tres claims no cambian de estado. El tercero afirma «sistemas que operan en
producción» y su alcance de evidencia son dos proyectos con `lifecycle: alpha` y `beta`.
Los que sí están en producción son `private` o `publish: none`: invisibles por diseño.

La evidencia recolectable no solo no sostiene el statement — **lo debilita**, porque hace
visible la brecha entre lo afirmado y lo comprobable. Y es autorreferencial: el lector hace
clic en la evidencia y aterriza en el repositorio que genera la página que está leyendo.

## Decisión

Se invierte el orden. **Primero se publica el feed solo-declarado**: los proyectos
publicables, los tres claims con `evidence_ids: []`, `evidence.json` vacío, y la ruta
`/evidencia` que explica por qué nada de eso se puede comprobar todavía.

La ingestión de GitHub vuelve al backlog, recalibrada (ver abajo).

## Lo que esta decisión cuesta, dicho antes de pagarlo

**Publicar congela el contrato `v1`.** La regla 2 de `05-feed-contract.md` empieza a aplicar
en el momento en que el primer PR de publicación se mergea: a partir de ahí, eliminar un
campo exige `v2`.

Es el momento de pagarlo, no una razón para no hacerlo — la limpieza del contrato del
2026-08-21, con sus cinco eliminaciones, se hizo precisamente para poder congelarlo. Pero
es una puerta de un solo sentido y por eso se escribe aquí.

## Cuatro correcciones de spec que este cambio obliga a hacer primero

Todas salieron del mismo review, todas verificadas contra el código y el Registry reales, y
ninguna derivada de un artefacto.

### 1. `sources[].public` es requerido (`02` §3, `05` → `projects.json`)

`projects.schema.json` exige `public_sources` y `has_private_sources`. El Registry **no
tenía el dato**: `ProjectSource` era `{ type, ref, role, period? }`. Derivarlo exige la API
de GitHub, y la inferencia barata —usar `project.visibility`— publicaría la URL de un
repositorio privado: `proof-of-work` es `visibility: public` y una de sus fuentes es
`rodrigoBermejo/proof-engine`, que es privado. `03` §2 lo prohíbe.

El campo se declara por fuente, no por proyecto, porque un proyecto público apoyado en un
repositorio privado no es una excepción rara: es el patrón normal de un producto con motor
separado (`decisions/0001`).

### 2. El recorte de claims se hace por publicabilidad, no por confidencialidad (`05`)

La regla decía «los ids de proyectos `confidential` se eliminan de `project_ids`».
`docencia-isc-upa` es `visibility: public`, `nda: false`, `context: client`,
`publish: none`: **no es `confidential`**. Una implementación fiel a la regla anterior lo
omitía de `projects.json` y dejaba su id dentro de `claims.json` — y ese id nombra a la
institución cliente.

Se añade además el **orden** de la transformación, porque derivar antes de recortar produce
un claim que acredita verificabilidad con evidencia que ya no está en el artefacto.

### 3. Las fechas se comprueban con `pattern`, no solo con `format` (`05`, schemas)

`format` en JSON Schema es una anotación, no una aserción, y este repositorio compila con
`strict: false` a propósito: enforzarlo exigiría `ajv-formats`, que es una dependencia
nueva. Consecuencia hasta ahora: `format: "date-time"` no rechazaba nada, y un
`start: "ayer"` validaba.

`pattern` sí es una aserción en toda implementación y no añade dependencias. Y de paso se
corrige el tipo: `timeframe` es un rango de **días**, no de instantes — el Registry ya
escribía `2026-03-01`, y declararlo `date-time` obligaba a inventar una hora falsa.

### 4. Existe un contrato de presentación (`05`)

El contrato decía qué se publica y qué está prohibido, y nada de **cómo se muestra**. Eso
dejaba las decisiones epistemológicas —qué aspecto tiene un claim que nadie puede
comprobar— en manos de quien implementara la página. Dos implementaciones igual de válidas
contra el schema comunican verdades distintas, y eso es un fallo del contrato.

`02` §6 ya prohibía la estética de lo verificable sobre lo declarable. Una prohibición sin
forma positiva produce la salida por defecto de la industria: un chip gris, un guion, un
`0`, o un vacío que dice «Próximamente». El contrato de presentación dice qué se hace en su
lugar.

## Cómo vuelve la ingestión

Recalibrada con hallazgos del mismo review:

- **Fuera `docencia-isc-upa`.** Siete repositorios de una organización de terceros,
  `publish: none`, con actividad de estudiantes. Grabar sus fixtures metería identidades de
  alumnos de forma permanente en el repositorio del motor, para producir evidencia que
  `03` §2 prohíbe publicar sin `release` firmado.
- **Tres `kind`, no siete.** `check_run` y `deployment` probablemente no tienen productor en
  estos repositorios: serían adaptadores muertos con fixtures inventadas.
- **La redacción de repos privados se mueve** al sprint donde produzca salida publicable. En
  V1 aporta todo el riesgo de fuga y ningún valor: la evidencia privada es `unverifiable` y
  nunca sube la verificabilidad de un claim, y los agregados viven en `activity.json`, que
  es V1.1.
- **El PAT de lectura es prerrequisito de entrada**, no un bloqueo a media carrera. La
  partición del gate en «mitad código» y «mitad credencial» se descarta: `06` define el gate
  como binario, y ambas voces la llamaron falso hito.

## Alternativas descartadas

- **Sprint 2 completo con el PAT primero.** Es lo más fiel al roadmap escrito, y construye
  siete adaptadores para producir evidencia que no cambia el estado de dos de los tres
  claims.
- **Sprint 2 recortado, manteniendo el orden.** Retira el riesgo grande —la fuga por
  fixtures— pero sigue sin publicar nada visible, y deja la afirmación de `06` sobre la
  entrega de valor sin cumplir un sprint más.
