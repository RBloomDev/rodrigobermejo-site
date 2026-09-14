# ADR 0014 — El sitio tiene spec de marca propia, y el contrato de presentación le gana

- **Estado:** **PROPUESTA.** No autoriza nada todavía.
- **Fecha:** 2026-09-12
- **Decide:** Rodrigo. Redactada por el agente como parte de la Fase 1 del rediseño.

> **Qué significa PROPUESTA aquí.** Rodrigo aprobó el *plan* que contemplaba escribir esta
> ADR; no ha aprobado su contenido, que es justamente lo que esta fase pone a revisión.
> Mientras el estado sea PROPUESTA, `docs/brand/` es un borrador y **no es autoridad sobre
> nada**: ni sobre `app/globals.css`, ni sobre los componentes, ni sobre el copy publicado.
> La Fase 2 —la implementación— no empieza hasta que este estado cambie a Aceptada por
> decisión suya. Es el mismo régimen que `decisions/0013`.

## Contexto

`docs/01-scope-v1.md:65` dice, literalmente:

> | Rediseño del sitio o del funnel comercial | Fuera de este sistema por completo |

Esa línea vive en la tabla de **fuera de alcance de V1 del motor de evidencia**. Excluye el
rediseño de este sistema; **no lo prohíbe**. La diferencia importa porque las dos lecturas
producen trabajos opuestos: una dice «no se hace», la otra dice «no se hace *aquí*». La
segunda es la correcta, y es la que esta ADR registra para que nadie vuelva a leer la
primera.

La otra regla que aplica es `AGENTS.md:8`:

> **Si falta spec: escribe spec, abre PR, y para.** No improvises la especificación mientras implementas.

Juntas dejan una sola salida: el rediseño necesita **su propia línea documental**. Colgarlo
de `docs/00`–`06` mezclaría dos productos con ciclos de vida distintos. El motor de
evidencia versiona por sprint y congela su contrato en cuanto publica (`decisions/0011`); la
marca cambia cuando cambia el posicionamiento, que no tiene sprints. Un documento que avanza
por dos relojes distintos termina desactualizado en ambos.

Existe además una reserva explícita anterior. `docs/audits/2026-08-19-site-baseline.md:148-154`
registró la decisión del 2026-08-20 de no tocar la tipografía durante el proyecto de
evidencia, y dijo qué sería en cambio:

> Cualquier modificación se tratará después como **tarea visual independiente, con revisión de diseño específica**.

Esa tarea es esta. Las deudas **#9** (tipografía base: `font-sans` en `<body>` frente a
`--font-body`) y **#12** (tokens `--font-*` de `@theme` sombreados por las variables de
`next/font`, reabierta el 2026-08-24; la fila vive en `docs/audits/2026-08-19-site-baseline.md:146`)
quedaron aparcadas esperándola. No se abre un frente nuevo: se cobra uno documentado hace
tres semanas.

## Decisión

Se crea **`docs/brand/`** como spec canónica de la marca y del sitio, separada de
`docs/00`–`06`, que son del sistema de Proof of Work.

`docs/brand/` gobierna identidad, posicionamiento, tipografía, color, arquitectura de la
información del sitio y copy público. `docs/00`–`06` siguen gobernando el dominio de
evidencia, el feed y su presentación. Ningún documento de `docs/brand/` modifica ni
reinterpreta `docs/00`–`06`.

### Regla de precedencia

En estas rutas y componentes:

| Superficie | Archivos |
|---|---|
| `/evidencia` | `app/evidencia/page.tsx` |
| `/proyectos` | `app/proyectos/page.tsx` |
| `/proyectos/[slug]` | `app/proyectos/[slug]/page.tsx` |
| Componentes de evidencia | `components/proof/**` |

**`docs/05-feed-contract.md` § Contrato de presentación (desde `:326`) y
`docs/02-domain-and-evidence-model.md` §6–§7 ganan sobre cualquier cosa que diga la spec de
marca.** Si la marca pide un color de estado, un icono, un badge o una jerarquía que el
contrato prohíbe, **gana el contrato**. No se negocia caso por caso, no se pide excepción y
no se resuelve «en la implementación»: divergencia = **FAIL**, no deuda.

Las reglas concretas que la marca no puede tocar, con su cita:

- **Los cuatro valores de cada eje se renderizan con el mismo peso, tamaño y color**, sin
  rampa cromática, sin orden implícito y **sin iconos en ninguno**
  (`docs/05-feed-contract.md:367-375`). Una escala de color *es* un puntaje aunque nadie lo
  llame así.
- **El par procedencia/verificabilidad va como una oración subordinada al pie del
  statement**, nunca como dos etiquetas junto al título
  (`docs/05-feed-contract.md:373-375`). Dos etiquetas junto a un título es la gramática de
  un badge de `verified`.
- **El índice canónico es la lista de afirmaciones, no la de proyectos**
  (`docs/05-feed-contract.md:410-418`). Una rejilla de proyectos como entrada invierte la
  cadena del dominio: es `Source → Dashboard` con otro nombre.
- **`dimension` es una etiqueta, nunca un filtro** (`docs/05-feed-contract.md:415-417`). Un
  control que filtra por dimensión la convierte en eje de comparación.
- **`meta.generated_at` se muestra como fecha absoluta, en prosa, nunca relativa**
  (`docs/05-feed-contract.md:402`).
- **`meta.counts` nunca se renderiza como cifras sueltas**; si se menciona, va dentro de una
  oración (`docs/05-feed-contract.md:403`). Una fila de cifras es el dashboard que este
  sistema existe para no ser.
- **Nunca se presenta lo declarable con la estética de lo verificable**
  (`docs/02-domain-and-evidence-model.md:423`): sin insignias de check, sin barras de
  progreso, sin colores de «validado» en claims `unverifiable`.

La razón de fondo es que estas no son preferencias visuales con forma de regla. Son
decisiones epistemológicas ya tomadas: dicen qué aspecto tiene una afirmación que nadie
puede comprobar. Una spec de marca que las sobrescriba no está cambiando un estilo, está
cambiando lo que el sitio afirma.

## Consecuencias

**Lo que gana el proyecto**

- El rediseño deja de ser una zona sin especificar donde cada decisión se improvisa en el
  commit. `AGENTS.md:8` queda satisfecho sin ensanchar el alcance de V1.
- Las deudas #9 y #12 tienen por fin el documento donde resolverse, con la revisión de
  diseño que el audit exigía.
- La frontera entre marca y evidencia queda escrita **antes** de que exista el código que la
  pueda cruzar, no después de cruzarla.

**Lo que cuesta**

- Un directorio más de spec que mantener, y un mapa de autoridad con dos raíces en vez de
  una. `AGENTS.md` debe decir cuál se lee para qué, o la separación se vuelve ambigüedad.
- Todo cambio en las rutas de evidencia paga dos revisiones: la de marca y la del contrato.

**El riesgo real no es mecánico, es normativo**

Ningún test protege el contrato de presentación. Un chip de color por estado de
verificabilidad, un badge con un check, una rejilla de proyectos como página de entrada o
una fila de cifras con `meta.counts` **pasan `npm run typecheck`, `npm run lint`,
`npm test`, `npm run build` y `npm run guard:funnel` en verde** y violan la spec. Esos gates
comprueban tipos, estilo de código, lógica del lector de feed y el cierre transitivo de
imports del funnel; ninguno comprueba gramática visual. Es el caso exacto que
`docs/04-architecture.md` §4.1 describe cuando dice que los guards son mitigaciones
acotadas y no garantías.

Por eso la **revisión adversarial del Reviewer** (`AGENTS.md:37-50`, seis ejes) es
obligatoria sobre este eje en todo PR que toque `app/evidencia/**`, `app/proyectos/**` o
`components/proof/**`. El eje 1 (Spec) deja de significar solo «cumple `docs/05` como
schema» y pasa a significar también «cumple `docs/05` § Contrato de presentación como
gramática». Un APPROVE que solo mire el verde de CI no es una revisión de este cambio.

## Alternativas descartadas

- **Meter el rediseño dentro de `docs/01-scope-v1.md`.** Contradice la propia línea 65 del
  documento: no se puede declarar algo fuera de alcance y especificarlo en la tabla de
  alcance del mismo archivo. Además acopla dos ciclos de vida —el motor versiona por sprint,
  la marca por posicionamiento— y obliga a tocar el documento de alcance de V1 cada vez que
  cambia un token de color.
- **No escribir spec y rediseñar directo.** Viola `AGENTS.md:8` de forma literal. En un
  trabajo donde el riesgo es normativo y no mecánico, improvisar la especificación mientras
  se implementa es exactamente el modo de fallo: la decisión queda enterrada en el commit y
  no hay contra qué revisarla.
- **Poner la marca en un repositorio aparte.** El sitio y la marca se implementan aquí, y la
  spec debe vivir junto a lo que gobierna. Es el mismo argumento de
  `docs/00-product-brief.md` § «Por qué la spec es pública»: la spec en el repo público hace
  las afirmaciones auditables y da a Builder y Reviewer **una única ubicación canónica**.
  Una spec de marca en otro repo tendría el defecto opuesto —gobernar código que no puede
  ver— y sin la contrapartida que justifica la separación del motor (`decisions/0001`), que
  es la confidencialidad. La marca no tiene nada que ocultar.
