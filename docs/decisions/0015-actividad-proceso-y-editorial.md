# ADR 0015 — Tres registros: evidencia, actividad y editorial

- **Estado:** **ACEPTADA el 2026-09-15.** Las **siete** autorizaciones (A–G) de §4 quedan concedidas.
- **Fecha:** 2026-09-13
- **Decide:** Rodrigo. El agente redactó el documento a petición suya del 2026-09-13 y lo
  revisó el 2026-09-14; Rodrigo aceptó las siete autorizaciones sin cambios el 2026-09-15.
  Donde el texto cita a Rodrigo antes de esa aceptación, cita lo que **pidió**; la decisión
  vigente es la aceptación registrada arriba.
- **Enmienda a:** `docs/00-product-brief.md` §No-objetivos · `docs/01-scope-v1.md` §Fuera de V1 · `docs/02-domain-and-evidence-model.md` §7 y §8 · `docs/05-feed-contract.md` § Contrato de presentación
- **No toca:** `docs/03-privacy-and-publication-policy.md`. Ninguna regla de privacidad se debilita.

> **Qué cambia con la aceptación.** Las siete autorizaciones de §4 entran en vigor, **B y C
> incluidas**. Con eso, dos reglas del núcleo pasan de «prohibido» a «prohibido **como
> métrica**, permitido **como declaración de proceso**», y esa frontera hay que sostenerla
> en cada pantalla futura: no se renegocia caso por caso.
>
> **Lo que la aceptación NO concede**, y §5 lo enumera entero: no autoriza publicar
> registros individuales de `Evidence` —eso es `decisions/0013`—, no autoriza ningún número
> que resuma a una persona, no autoriza inferencia alguna, y no exime a ninguna superficie
> nueva de escribir su spec antes de implementarse (`AGENTS.md:8`).
>
> **Corrección de una advertencia original.** Este documento afirmó que no existía ninguna
> fuente de tiempo humano registrado. Eso era falso: M-21 de
> `docs/plataforma/03-catalogo-de-metricas.md` documenta la medición de actividad humana en
> un editor instrumentado disponible desde el 2026-09-14, con sus límites y cobertura. Se
> conserva aquí el error para no borrar el registro histórico. Las ejecuciones de agentes y
> su duración **sí siguen sin fuente**; autorizar B no crea ese dato.

---

## Contexto

El 2026-09-13 Rodrigo pidió que el sitio represente su trabajo como CTO, constructor y
docente; que recupere la plataforma de noticias que originó la iniciativa; y que tenga
una pantalla de proyectos con presencia visual, métricas reales y contenido suficiente
para explorar. Pidió también, literalmente, **«la modificación mínima y explícita de la
especificación que permita implementarlas»**, conservando el historial de decisiones.

Un inventario del contrato encontró que de las siete cosas que pidió ver en pantalla,
**tres chocan con prohibiciones declaradas permanentes**, y no solo en prosa: están
escritas en el JSON Schema ejecutable.

| Lo pedido | Regla que lo bloquea hoy | Dónde |
|---|---|---|
| Tiempo humano registrado | `hours` prohibido | `05:309`, `02:467`, `activity.schema.json:61` |
| Ejecuciones de agentes | `agent_sessions`, `tool_calls` prohibidos | `00:65`, `02:467`, `activity.schema.json:59-60` |
| Participación de IA | Sin campo; diferido a V2 | `02:488` |
| Filtros por dimensión | «`dimension` es una etiqueta, no un filtro» | `05:415-416` |
| Proyectos como entrada visual | «El índice canónico es la lista de afirmaciones, no la de proyectos» | `05:410-412` |
| Entregas y evolución temporal | `activity.json` era V1.1 | `01:39`, `05:18` |
| Detalle detrás de cada cifra | Nadie había autorizado publicar registros individuales de `Evidence` al redactar esta tabla | `decisions/0013` — **ACEPTADA el 2026-09-15**; el motor todavía no la implementa |

**La lectura fácil sería decir que la petición contradice el producto. Es la lectura
equivocada,** y este ADR explica por qué — pero también dice con precisión qué parte de
la petición **no** se puede satisfacer, ni con enmienda ni sin ella.

---

## El hallazgo que hace posible la enmienda

La prohibición de `00-product-brief.md:65` no dice que esos números no puedan existir.
Dice, literal:

> «No usa líneas de código, conteo de commits, streaks, stars, followers, tokens
> consumidos, sesiones de IA ni tool calls **como indicador de nada**.»

El objeto de la prohibición es **el uso**, no el número.

Esa lectura es del agente, no de Rodrigo, y conviene separarlo. Lo que él escribió al
pedir el cambio fue: *«Los conteos y la telemetría describen actividad; no otorgan
automáticamente competencia, calidad o seniority.»* Es una restricción sobre lo que un
conteo **no** confiere; **no** es una autorización a publicarlo, y no dice nada sobre la
distinción entre uso y número. La construcción de esa distinción, y todo lo que se apoya
en ella en este documento, fue propuesta del agente; las autorizaciones que se apoyan
en ella quedaron concedidas el 2026-09-15.

Lo que sí es anterior a esta petición, y no lo propone el agente, es que
`docs/02-domain-and-evidence-model.md:496` **ya había tomado** una decisión de la misma
forma para la asistencia de IA:

> «**Será una anotación de procedencia, no una métrica de productividad.** Es
> divulgación: declara *cómo* se produjo el trabajo. Que un PR fuera asistido no lo hace
> mejor ni peor, y el sistema no debe insinuar ninguna de las dos cosas.»

La enmienda no inventa una categoría para colar números prohibidos. **Generaliza una
decisión que el modelo ya había tomado** para un caso, y la convierte en la tercera clase
que le faltaba a `02` §7.

---

## Lo que se propone

> **Nota histórica:** todo lo de esta sección se redactó como propuesta. Rodrigo aceptó
> las siete autorizaciones sin cambios el 2026-09-15; desde esa fecha rige el contrato
> enmendado. La aceptación autoriza el alcance, pero no afirma que los mecanismos ya estén
> implementados.

### 1. Tres registros, no uno

El sistema pasa a distinguir tres registros con reglas propias. Hoy el contrato solo
modela el primero, y por eso los otros dos no tenían dónde existir salvo violándolo.

| Registro | Qué afirma | Raíz | Regla que lo gobierna |
|---|---|---|---|
| **Evidencia** | Que algo ocurrió, quién lo hizo y cuándo, comprobable por un tercero | `Claim` | `02` §7 sin cambios. `claim_ids` obligatorio |
| **Actividad** | Qué volumen de trabajo se registró en un periodo | `Claim` | `activity.json`, `claim_ids` obligatorio. Se adelanta de V1.1 |
| **Proceso** | **Cómo** se produjo el trabajo: con qué asistencia, con cuánto tiempo registrado | Declaración humana | **Clase nueva.** Reglas en §3 |
| **Editorial** | Lo que se publica sobre el mundo, no sobre el sujeto | Pieza | `03` §4 («Fronteras que nunca se cruzan») sin cambios: enlaza a evidencia, **jamás se deriva de ella** |

**La frontera que sostiene todo esto:** un número de evidencia dice algo **sobre el
sujeto del portafolio**. Un número de proceso dice algo **sobre el método**. El primero
puede inflarse para parecer mejor; el segundo no tiene esa dirección — declarar que la
mitad del trabajo fue asistido por IA no halaga a nadie. Esa asimetría es la razón por la
que la clase nueva no reabre la puerta del vanity.

### 2. Lo que NO cambia

Se conserva íntegro, y esta lista es tan normativa como las autorizaciones:

- **`score`, `rank`, `experience_level`, niveles y porcentajes de experiencia** siguen
  prohibidos permanentemente (`05:304-310`, `06:80`).
- **«No existe un número que resuma a una persona»** (`02:482`) sigue vigente. Ninguna
  cifra de proceso se agrega en un índice global.
- **`tokens_used` y `prompts` siguen prohibidos.** Los tokens no son resultados, y un
  prompt es contenido, no metadato. Rodrigo lo reiteró al pedir el cambio.
- **Nunca se publican prompts, transcripciones, diffs generados ni código privado**
  (`AGENTS.md:60`, `docs/02-domain-and-evidence-model.md` §7 «Prohibido en el schema» y §8
  punto 2). Citado **por sección**: `02:494` apuntaba a una línea que ya no es esa regla.
- **Toda la política de privacidad** (`docs/03`): umbral k, ≥2 sujetos independientes,
  nada de proyectos `confidential`, coarsening mensual o trimestral, sin cruces
  reidentificantes. **Ninguna se toca, ni se baja, ni se afina.**
- **`claim_ids` obligatorio** para toda métrica de evidencia y de actividad.
- **Telemetría ≠ experiencia** (`00:56`) y las cinco cosas que la evidencia puede
  sostener (`00:46-52`).
- **La cadena `Claim → Project → Evidence`** y la prohibición de la cadena inversa.
- **El contrato de presentación** de `/evidencia`: los dos ejes con el mismo peso, el par
  como oración al pie, orden del Registry, sin iconos ni color de estado.

### 3. Clase nueva: declaración de proceso

Un número de proceso **solo es publicable si cumple las seis condiciones**. No son
recomendaciones: si falta una, el número no se publica.

1. **Fuente registrada explícitamente, nunca inferida.** No se deduce tiempo humano de
   commits, de mensajes, ni de cuánto estuvo abierto un editor. **Si no hay registro, no
   hay número**, y el hueco se muestra como hueco declarado.
2. **Nunca se suman clases distintas.** Horas humanas y duración de ejecuciones de
   agentes no se agregan en un total. Son unidades distintas de cosas distintas.
3. **Duración acumulada ≠ tiempo transcurrido**, y la unidad se declara siempre.
4. **Va acompañada de su cobertura.** Un número de proceso sin decir qué fracción del
   trabajo cubre miente por omisión. La cobertura se muestra junto al número, no en una
   nota al pie.
5. **No se presenta como logro.** Sin orden descendente, sin comparación contra el
   periodo anterior, sin flecha de tendencia, sin destacado tipográfico — las mismas
   cuatro prohibiciones que `02:447` impone a la metadata.
6. **No implica competencia, calidad ni seniority, y la interfaz lo dice.** No se deja
   implícito: es la consecuencia directa de `00:56`.

**Prohibición nueva que introduce esta clase**, porque sin ella la clase sería un
agujero: **queda prohibido derivar un porcentaje de «trabajo hecho por IA», de «horas
ahorradas» o cualquier ratio equivalente.** No hay denominador honesto para esa fracción,
y construirlo sería exactamente el indicador que `00:65` prohíbe. Rodrigo lo pidió con
esas palabras y aquí queda como regla.

### 4. Autorizaciones que se solicitan

| # | Qué se pide autorizar | Qué regla se acotaría | Qué se conserva intacto |
|---|---|---|---|
| A | **Adelantar `activity.json` de V1.1 al alcance actual** | `01:39`, `01:66`, `05:18` | El schema no cambia: `claim_ids` obligatorio, periodo mes o trimestre, los cinco `counts` enteros, los ocho campos prohibidos. **Es calendario, no contrato** |
| B | **Adelantar la anotación de procedencia de asistencia de V2** | `01:55`, `02:488` | Su forma ya estaba decidida en `02` §8 y no se rediscute: `provider_id` como valor, **el vínculo y nunca el contenido**, procedencia y **nunca métrica**, sin tokens ni tool calls |
| C | **Publicar declaraciones de proceso** bajo las seis condiciones de §3 | Acota `00:65`, `02:467`, `05:309` de «prohibido» a «prohibido como indicador; permitido como declaración de proceso» | Los términos siguen prohibidos **como métrica**. `tokens_used` y `prompts` siguen prohibidos **en cualquier clase** |
| D | **Filtrar por proyecto y por periodo** | Ninguna. No existía prohibición | — |
| E | **Filtrar por dimensión, solo en las superficies de actividad y proyectos** | `05:415-416` | **`/evidencia` conserva el índice sin filtros y en orden de Registry.** El control no muestra conteos por dimensión: eso sí sería el eje de comparación que la regla evita |
| F | **Una pantalla de proyectos y actividad con presencia visual plena** | Ninguna sobre lo visual | **`/evidencia` sigue siendo el índice canónico del sistema de evidencia.** La pantalla de actividad no reclama serlo y enlaza a él |
| G | **Una plataforma editorial dentro del sitio** | Ninguna. No existía regla sobre contenido editorial salvo la frontera | `03` §4 («Fronteras que nunca se cruzan») intacta: el editorial **enlaza** a evidencia y **jamás se deriva de ella ni la alimenta** |

### 4-bis. Cómo se presentan las cifras: explorar sin calificar

Rodrigo pidió poder **explorar contenido, entregas, tiempo registrado y uso de IA
mediante cifras, tendencias y detalles visuales**. La tensión con el producto es real y
no se resuelve prohibiendo la exploración: se resuelve fijando qué separa explorar de
calificar.

**La prueba, en una frase:** una cifra **describe un periodo**; una calificación
**ordena a personas**. Todo lo que sigue sale de ahí.

| Se puede | No se puede |
|---|---|
| Una cifra **con su unidad y su periodo** al lado | Una cifra sola, grande, sin contexto |
| Una **tendencia dentro de una serie propia** («marzo tuvo más que febrero») | Una tendencia presentada como **mejora o progreso** |
| **Detalle desplegable** con fuente, cobertura y deduplicación | Un detalle que solo repita la cifra más grande |
| Comparar **un periodo consigo mismo** | Comparar contra **otra persona**, un promedio o un objetivo |
| **Filtrar** para ver un subconjunto | Filtrar y que el control **muestre conteos por opción** |
| Decir **qué no cubre** la cifra | Dejar la cobertura implícita |

**Seis reglas de forma**, que se pueden verificar mirando la pantalla:

1. **Ninguna cifra es tipográficamente mayor que la etiqueta que la nombra.** Un numeral
   grande es un titular, y un titular sobre una persona es una calificación.
2. **Cero flechas de tendencia, cero verdes y rojos, cero comparación contra el periodo
   anterior como juicio.** Una serie puede subir y bajar; la interfaz no dice si eso es
   bueno. Es la prohibición que `02:447` ya impone a la metadata, extendida.
3. **Sin ranking ni orden descendente por magnitud** en ninguna lista de proyectos,
   periodos o lenguajes. El orden es cronológico o del Registry.
4. **Sin barras de progreso, sin porcentajes de completitud, sin rachas.** Una racha
   premia la continuidad por sí misma, que es una calificación disfrazada de dato.
5. **Sin contadores animados.** Un número que sube solo está actuando un logro.
6. **Toda cifra lleva su detalle accesible**, y el detalle incluye qué **no** cubre.

**Y una regla sobre la serie temporal**, porque es donde más fácil se cuela el juicio:
una serie se dibuja **completa, con sus huecos visibles**. Un mes sin dato no se dibuja
como cero ni se interpola: se marca como sin dato. Recortar la serie al tramo favorable
es construir una tendencia, no mostrarla.

### 4-ter. Cuatro distinciones que la interfaz no puede colapsar

Rodrigo las nombró una por una. Fundir cualquiera de ellas convierte el tablero en
propaganda, y son fáciles de fundir por descuido.

| No es lo mismo | Y la interfaz debe separarlo así |
|---|---|
| **Consumo** (tokens, llamadas) y **resultado** | El consumo no se publica. `tokens_used` sigue prohibido en cualquier clase. Nunca se presenta un consumo junto a un entregable como si lo explicara |
| **Horas de agente** y **horas humanas** | Nunca en el mismo total, nunca en la misma serie, nunca en el mismo eje. Unidades distintas de cosas distintas. Si van en la misma pantalla, van en bloques separados y rotulados |
| **Repositorio accesible** y **proyecto atribuible** | Tener acceso a un repositorio no significa haberlo hecho. Un proyecto con varios autores no es contribución personal, y la cifra lo dice o no se publica |
| **Trabajo colectivo** y **contribución personal** | Donde el trabajo es de equipo, se atribuye al equipo. El porcentaje de autoría dentro de un repositorio con más gente **no se publica**: revela composición de equipo ajena |

**Y la regla que las cruza todas:** *una fuente ausente sigue siendo un dato
desconocido*. No es cero, no es «pendiente», no es «próximamente». Un hueco se rotula
como hueco, se dice por qué, y **nunca se rellena** — ni con una estimación, ni con una
interpolación, ni con un guion que parezca un valor.

### 5. Lo que esta enmienda NO pide autorizar, y hay que decirlo

- **No pide autorizar la publicacion de registros individuales de `Evidence`.** Eso lo decide
  `decisions/0013`, **ACEPTADA el 2026-09-15** — pero aceptar el mecanismo no publica nada:
  ningún proyecto del Registry declara `publish_evidence` y el motor todavía no lo
  implementa, así que el motor sigue abortando si llega
  evidencia al artefacto. **El «detalle detrás de cada cifra» llega hasta donde ese ADR
  permita, no más.**
- **No pide autorizar ningun numero que resuma a una persona.** Nunca.
- **No pide autorizar inferencia alguna.** Este punto afirmó originalmente que **no existía
  ninguna fuente de tiempo humano registrado ni de ejecuciones de agentes**. La primera
  mitad era falsa: M-21 de `docs/plataforma/03-catalogo-de-metricas.md` registra desde el
  2026-09-14 una fuente de actividad humana en un editor instrumentado, con cobertura
  limitada. La segunda sigue vigente: el ledger de `proof-engine` contiene solo un
  `.gitkeep`, por lo que las ejecuciones de agentes y su duración siguen sin fuente. La
  enmienda abre el permiso; no crea los datos que falten.
- **No pide saltarse `AGENTS.md:8`.** Cada superficie nueva necesita su spec antes de
  implementarse.

---

## Cómo conviven los tres registros

La pregunta que Rodrigo hizo explícita. En una frase por frontera:

- **Actividad → Evidencia.** La actividad **cuelga de claims** (`claim_ids` obligatorio).
  No hay agregado global: si un mes no sostiene ninguna afirmación, no se publica. La
  actividad no es el producto.
- **Proceso → Evidencia.** El proceso **no cuelga de claims** porque no afirma nada sobre
  el sujeto. Por eso tampoco puede presentarse junto a un claim de forma que parezca
  respaldarlo. Va en su propia superficie, rotulada por lo que es.
- **Editorial → Evidencia.** Frontera de una sola dirección, sin cambios: el editorial
  puede **enlazar** a `/evidencia`; **nunca** derivarse de ella ni alimentarla. Una pieza
  sobre un tema no se convierte en evidencia del autor, y la evidencia no se convierte en
  material editorial.
- **Editorial → Proceso.** Cuando una pieza cubra trabajo propio o de Inadaptados, **se
  declara la relación en la pieza**. Es divulgación de conflicto de interés, y es la
  única vía por la que los dos registros se tocan.

---

## Consecuencias

**Lo que gana el proyecto.** El modelo deja de tener un solo régimen para tres cosas
distintas. Hasta hoy, cualquier número que no fuera métrica de evidencia solo podía
existir violando el contrato o disfrazándose de metadata — que es precisamente la vía de
ruptura que `AGENTS.md:61` manda vigilar. Nombrar la clase cierra esa vía en lugar de
abrirla.

**Lo que cuesta.** Tres cosas, y ninguna es menor:

1. **Superficie de revisión mayor.** Ningún test protege las seis condiciones de §3. Son
   revisión visual, igual que el contrato de presentación.
2. **Una vía de abuso nueva**, y hay que nombrarla para poder vigilarla: **reetiquetar
   una métrica de evidencia como declaración de proceso** para publicarla sin `claim_ids`.
   Es el espejo exacto del abuso que `02:448` ya describe. La prueba es la misma: **si el
   número dice algo sobre el sujeto del portafolio, es métrica de evidencia**, se llame
   como se llame. Es lo primero que debe buscar el Reviewer en un PR que toque esta clase.
3. **El riesgo de que el permiso se confunda con el dato.** Autorizar publicar tiempo
   registrado no hace que exista tiempo registrado. Si la pantalla muestra un hueco
   donde debía ir esa cifra, el hueco es el estado correcto del sistema, no un defecto
   pendiente.

---

## Alternativas descartadas

**(a) No enmendar nada y construir solo lo que hoy cabe.** Daría una pantalla de
proyectos con los cinco `counts` de `activity.json` y nada más: sin proceso, sin IA, sin
filtros. Se descarta porque deja fuera la mitad de lo que Rodrigo pidió, y porque la
razón para dejarlo fuera sería una lectura de la regla —«prohibido el número»— que el
texto de la regla no sostiene: prohíbe el uso como indicador.

**(b) Levantar la prohibición de `hours`, `agent_sessions` y `tool_calls` sin más.** Es
la enmienda de una línea, y es la peor. Deja los términos disponibles para cualquier uso,
incluido el que la tesis prohíbe, y convierte el producto en el dashboard de actividad
que `00:63` dice que no es. La condición, no el término, es lo que protege la tesis.

**(c) Publicar esas cifras en una ruta distinta o con otro nombre de campo.** Es
exactamente lo que Rodrigo prohibió al pedir el cambio: *«No eludas restricciones
cambiando nombres o moviendo datos a otra ruta.»* Y es el abuso que `AGENTS.md:61` manda
buscar. Descartada sin más discusión.

**(d) Sacar la plataforma editorial a otro dominio y otra marca.** Evitaría la frontera de
`03` §4 («Fronteras que nunca se cruzan») por separación física. Se descarta **para esta entrega** porque Rodrigo pidió
explícitamente demostrar el producto dentro del sitio y no decidir marca ni dominio
ahora. Queda como opción abierta, no como decisión tomada.


## Registro histórico de las afirmaciones corregidas

Los siguientes textos se conservan literalmente como registro del error, no como
instrucción vigente. La corrección que cita M-21 arriba los sustituye respecto del
tiempo humano; las ejecuciones de agentes siguen sin fuente.

> **Y una advertencia que la aceptación no cambia:** autorizar B no crea el dato. Hoy no
> existe ninguna fuente de tiempo humano registrado ni de ejecuciones de agentes, así que
> esas dos cifras **seguirán vacías** hasta que exista el registro que las produzca. El
> permiso está abierto; el dato no.

- **No pide autorizar inferencia alguna.** Y aquí está el límite práctico más importante: hoy **no
  existe ninguna fuente de tiempo humano registrado ni de ejecuciones de agentes**. El
  ledger de `proof-engine` contiene solo un `.gitkeep`. Así que aunque esta enmienda
  quede aprobada, **esas dos cifras seguirán vacías** hasta que exista el registro. La
  enmienda abre el permiso; no crea el dato.
