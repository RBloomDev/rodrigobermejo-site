# 01 — `/noticias` y `/actividad`: spec de las superficies

> **Estado: normativo desde su merge.** Es la spec que `decisions/0015` §5 exige antes de
> implementar: la ADR concede las autorizaciones **F** (pantalla de proyectos y actividad con
> presencia visual plena) y **G** (plataforma editorial dentro del sitio), y dice literal que
> **no pide saltarse `AGENTS.md:8`** — cada superficie nueva necesita su spec antes de
> implementarse. Sin este documento, `/noticias` y `/actividad` no se construyen.
>
> **Esta autoridad no afirma que nada de lo aquí descrito esté implementado ni publicado.**
> Hoy no existe `app/noticias`, no existe `app/actividad`, y no existe
> `public/proof/v1/activity.json`. §5 dice qué se renderiza en ese estado y por qué ese estado
> es el correcto.

## Autoridad y precedencia

Lo que este documento **sí** gobierna: qué alimenta cada ruta, qué se renderiza, qué forma
pueden tomar las cifras, qué filtros existen y qué se muestra cuando falta el dato.

Lo que **no** gobierna, y quién manda en su lugar:

| Materia | Autoridad |
|---|---|
| El copy concreto: títulos, etiquetas, microcopy, textos de los avisos | **`docs/brand/03-copy-deck.md`.** Este documento fija qué tiene que decir un aviso, nunca con qué palabras |
| Rutas, navegación, sitemap, metadatos por ruta | `docs/brand/02-arquitectura-y-urls.md` §1, §2, §4 y §5 |
| La forma del feed: campos, valores, tipos | **`docs/05-feed-contract.md`.** Este documento no añade ni un campo ni un valor. Ver §6 |
| Qué se puede publicar | **`docs/03-privacy-and-publication-policy.md`.** Ninguna regla suya se toca, se baja ni se afina |
| El esquema, las fuentes y el canal editorial | `docs/plataforma/02-editorial.md` |
| Qué cifras existen, con qué cobertura y qué significan sus ceros | `docs/plataforma/03-catalogo-de-metricas.md` |
| Sistema visual, tokens, tipografía | `docs/brand/01-design-system.md` |

En `/actividad`, cuando este documento y `docs/05` § Contrato de presentación parezcan decir
cosas distintas sobre cómo se muestra una cifra de evidencia, **manda `docs/05`**. Es la misma
cláusula de precedencia que `docs/brand/02` ya declara para `/evidencia` y `/proyectos`, y la
divergencia es **FAIL, no deuda**.

`docs/plataforma/prototipo/` (`noticias.html`, `noticia.html`, `proyectos.html`) es
**referencia no normativa**: enseña una solución, no la define. Donde el prototipo y este
documento difieran, manda este documento.

---

## 1. `/noticias` y `/noticias/[slug]`

### 1.1 Se alimenta del corpus publicado, nunca del borrador

**`/noticias` lista exactamente las piezas cuyo `estado` es publicado. Ninguna otra.** El
registro editorial y sus campos están definidos en `docs/plataforma/02-editorial.md` §3 y esta
spec no los redefine.

Tres requisitos, y el tercero es el que hace que la regla no se rompa por descuido:

1. **El filtrado por estado ocurre en la lectura del corpus, no en el render.** Una pieza en
   borrador no llega al componente. Un `.filter()` dentro del JSX es la forma en que un
   borrador se sirve por accidente: basta un cambio de orden de operaciones para que aparezca.
2. **`/noticias/[slug]` devuelve 404 para una pieza no publicada.** No una página con aviso,
   no un borrador con marca de agua: **404**. Una ruta que responde 200 con un borrador lo
   publicó, se llame como se llame. Y `generateStaticParams` solo enumera piezas publicadas,
   así que la ruta no existe en el build.
3. **`estado` es el único criterio.** No la fecha, no la presencia de `procedencia.publicado`,
   no que la verificación esté completa. Un segundo criterio paralelo crea dos definiciones de
   «publicado» y con el tiempo divergen.

**Medido el 2026-09-17 sobre `docs/plataforma/prototipo/datos/piezas.json`: tres piezas, las
tres en `estado: "borrador"`, cero publicadas.** `02-editorial.md` §3 declara además que
`"borrador"` es hoy el **único valor permitido** y que
`procedencia.publicado` es `pendiente` en todo el corpus. Consecuencia directa y correcta:
**`/noticias` renderiza hoy su estado vacío, y `/noticias/[slug]` no tiene ni una ruta.** Ver
§5. Publicar una pieza es una decisión de Rodrigo, no un efecto de implementar esta spec.

### 1.2 La frontera con la evidencia, intacta y en una sola dirección

La autoridad es **`docs/03-privacy-and-publication-policy.md` §4, tabla «Fronteras que nunca
se cruzan»** — hoy en `docs/03:194`:

> «Contenido editorial (`content/`) → Evidencia: El blog puede *enlazar* a evidencia; jamás
> derivarse de ella ni alimentarla.»

> **Corrección de referencia.** `decisions/0015` (§1, §4-G, § *Cómo conviven los tres
> registros*) y `docs/plataforma/02-editorial.md` §0 citan esta regla como **`03:136`**. En el
> árbol actual `docs/03:136` está en blanco, dentro de §3 — reglas de publicación de métricas —
> y la frontera editorial vive en **`docs/03:194`**. **La regla no cambió; la referencia
> derivó** al crecer `docs/03`. Se cita aquí por sección, no por línea, porque una sección no
> se desplaza. Corregir las citas de esos dos documentos queda registrado como hallazgo y
> **no** se hace en esta entrega: son sus documentos, no este.

Traducido a requisitos sobre estas dos rutas:

| Dirección | Permitido | Prohibido |
|---|---|---|
| Editorial → `/evidencia` | Un enlace, en el cuerpo de una pieza o al pie | Nada más |
| Evidencia → editorial | **Nada en el contenido.** Ni una pieza derivada de un claim, ni un claim ilustrado con una pieza. La navegación compartida del sitio no es contenido de la página: ver la prohibición 4 | Todo lo que sea derivación, respaldo o ilustración |

Seis prohibiciones concretas, porque «jamás se deriva» se rompe en formas específicas:

1. **`/noticias` y `/noticias/[slug]` no leen el feed.** Cero imports de `lib/proof`,
   `lib/evidence`, `components/proof` o `public/proof`. El corpus editorial es su única fuente
   de datos.
2. **Una pieza editorial no es evidencia de Rodrigo, y la interfaz no lo insinúa.** No se
   cuentan piezas en `/evidencia`, en `/proyectos` ni en `/actividad`. «20 análisis
   publicados» es una métrica de evidencia sobre el sujeto sin `claim_ids` — prohibida por
   `docs/05` § *Prohibido en el contrato* y por `AGENTS.md:61`.
3. **Ninguna pieza se convierte en `Evidence`, ni con `provenance: declared`.** El corpus
   editorial no es fuente de ingesta del motor. Ver `docs/plataforma/02-editorial.md` §5.
4. **Ninguna superficie de evidencia presenta una pieza editorial como respaldo.** En el
   contenido de `/evidencia`, `/proyectos` y `/actividad` no hay enlaces a `/noticias` ni a
   una pieza: ni junto a un claim, ni como «cobertura», ni en una lista de lecturas, ni al
   pie de una ficha. Esa dirección del enlace es la que convierte el editorial en evidencia.

   **Esto no prohíbe la navegación compartida, y la distinción es normativa.** `Navbar` y
   `Footer` son el mismo cromo en todas las rutas del sitio, y su entrada «Noticias»
   (`docs/brand/02` §2) aparece en `/evidencia` igual que aparece «Escribo» o «Trayectoria».
   Un menú idéntico en todas las páginas no afirma nada sobre ninguna. Montar ese cromo en
   `/evidencia` es además **obligatorio**: `docs/brand/02` §1 → *Defecto encontrado al levantar
   el mapa* lo exige, porque hoy esa ruta es un callejón sin salida.

   Dónde cae la frontera, para que no haya que interpretarla:

   | Enlace | Veredicto |
   |---|---|
   | «Noticias» en el `Navbar` o el `Footer` de `/evidencia` | **Permitido.** Es cromo de sitio, idéntico en toda ruta |
   | Un enlace a `/noticias` en el cuerpo de `/evidencia`, aunque sea genérico | **Prohibido.** El cuerpo es la página, y ahí el enlace afirma pertenencia |
   | Un enlace a una pieza junto a un claim, un proyecto o una cifra | **Prohibido.** Es exactamente presentar el editorial como respaldo |

   La regla que protege `docs/03` §4 es sobre **datos**: derivar o alimentar. El cromo no
   deriva ni alimenta nada. Lo que se prohíbe es la relación afirmada, no la existencia de un
   hipervínculo en la página.

5. **No se publica un contador de piezas en ninguna superficie de evidencia**, ni como
   metadata de presentación. La exención de `meta.counts` es para el feed, no una vía para
   reetiquetar un conteo editorial (`docs/02` §7; es el abuso que `AGENTS.md:61` manda buscar).
6. **Una pieza que cubra un proyecto del Registry no lo enlaza como evidencia**, sino como
   sujeto de la noticia, y con la declaración de §1.3.

### 1.3 Declaración de conflicto de interés

**Cuando una pieza cubra trabajo propio de Rodrigo, de Inadaptados o de un cliente, la
relación se declara en la pieza.** Es la única vía por la que el registro editorial y el de
proceso se tocan (`decisions/0015` § *Cómo conviven los tres registros* → Editorial → Proceso),
y `docs/plataforma/02-editorial.md` §4 ya la exige. Requisitos de forma, verificables mirando
la pantalla:

| # | Requisito | Se rompe si |
|---|---|---|
| 1 | La declaración va **en la pieza**, visible en el cuerpo, **no** en una página de ética aparte ni solo en el pie | Existe una página «política editorial» y la pieza no dice nada |
| 2 | Va **antes** del primer párrafo del análisis, no al final | Hay que leer la pieza entera para enterarse |
| 3 | **Nunca dentro de un `<details>` cerrado.** Un aviso que exige un clic es un aviso que no se dio | El texto está plegado |
| 4 | Dice **cuál** es la relación, con el nombre de la parte. No «el autor puede tener interés» | El texto es una plantilla genérica |
| 5 | Se renderiza **solo cuando existe**. `relacion_declarada: null` no produce bloque vacío ni «sin conflicto declarado» | Aparece un bloque para todas las piezas |
| 6 | Su ausencia **bloquea la publicación** de una pieza que cubra parte relacionada — no la degrada | La pieza se publica sin ella |

El requisito 5 tiene una razón que no es estética: un bloque «sin conflicto declarado» en toda
pieza entrena al lector a ignorarlo, y entonces tampoco lee el que sí importa.

**Quién decide que existe relación es una persona.** No hay heurística: coincidencia de
nombres, dominios o repositorios no la establece ni la descarta.

### 1.4 Qué se renderiza por pieza

`02-editorial.md` §2 y §3 fijan los campos. Esta spec fija que **no hay campo obligatorio que
no se renderice**, porque el peor defecto medido en RuntimeWire fue declarar etiquetas que el
código no tiene (`02-editorial.md` §1). Mínimo, en `/noticias/[slug]`:

- `tipo` (`noticia` · `analisis` · `opinion`), **siempre visible**, nunca solo por color.
- `hecho` y `ocurrido_en`, distinguido de `redactado_en`.
- `que_cambia`.
- `mexico` **con su estado**, incluido `no_verificado`, que es un valor legítimo y se publica
  como tal.
- `no_establece[]` completo, **junto al hallazgo y no en un recuadro al final**.
- `fuente_primaria` y `fuentes[]`, con medio y fecha, enlazadas.
- `procedencia` de las cuatro etapas, **abierta por defecto**. Ellos la colapsan y el lector
  no se entera de que nadie revisó la nota.
- `relacion_declarada` cuando no sea `null` (§1.3).
- `correcciones[]` cuando existan, con fecha, y **sin borrar el texto corregido**.

En `/noticias` el índice muestra `tipo`, `titulo`, `entradilla` y `ocurrido_en`. **Orden
cronológico descendente por `ocurrido_en`**, que es orden temporal y no de magnitud: no cae en
la prohibición de §2.3. Sin destacados, sin «más leído», sin pieza principal de mayor tamaño
—eso último es un ranking dibujado.

---

## 2. `/actividad`: las seis reglas de forma, una por una

`decisions/0015` §4-bis fija **seis reglas de forma, «que se pueden verificar mirando la
pantalla»**, más una regla sobre la serie temporal. Se traducen aquí **una por una y sin
refundirlas**: cada una conserva su número, su alcance y su literalidad. Son seis requisitos,
no un principio con seis ejemplos.

La prueba de la que salen todas, literal: **«una cifra describe un periodo; una calificación
ordena a personas».**

Ninguna de las seis está protegida por un test. `decisions/0015` § *Consecuencias* lo dice: son
**revisión visual**, igual que el contrato de presentación. Por eso cada regla trae aquí cómo
se comprueba y cómo se rompe.

### 2.1 Regla 1 — Ninguna cifra tipográficamente mayor que su etiqueta

> «Ninguna cifra es tipográficamente mayor que la etiqueta que la nombra. Un numeral grande es
> un titular, y un titular sobre una persona es una calificación.»

**Requisito.** Para toda cifra de la pantalla, el `font-size` computado del numeral es **menor
o igual** al de la etiqueta que lo nombra. El `font-weight` tampoco es mayor. La etiqueta es
visible y adyacente, no un `aria-label`.

**Cómo se comprueba mirando la pantalla.** Se enumeran los nodos que contienen un numeral, y
para cada uno se lee el tamaño computado del numeral y el de su etiqueta. `<=` en todos los
pares, o FAIL. No se estima a ojo: un `28px` frente a un `24px` se ve igual y viola la regla.

**Cómo se rompe.** Una «tarjeta de KPI»: número en grande, etiqueta chica debajo. Es la salida
por defecto de cualquier librería de dashboard, y por eso la regla existe. También se rompe con
un numeral en `font-weight: 700` sobre etiqueta en `400` al mismo tamaño.

### 2.2 Regla 2 — Cero flechas, cero verde y rojo, cero juicio contra el periodo anterior

> «Cero flechas de tendencia, cero verdes y rojos, cero comparación contra el periodo anterior
> como juicio. Una serie puede subir y bajar; la interfaz no dice si eso es bueno.»

**Requisito**, en sus tres partes, que no se reducen a una:

1. **Cero flechas de tendencia.** Ni `▲▼`, ni iconos de flecha, ni triángulos, ni `+`/`−`
   como señal de dirección.
2. **Cero verdes y rojos.** En ninguna cifra, celda, borde o fondo de `/actividad`, **sea cual
   sea su intención**. La prohibición es del color, no del significado que se le atribuya: no
   hay excepción por «aquí el verde solo identifica una fuente» ni por «el rojo es de marca».
   Una vez que un verde y un rojo conviven en una pantalla de cifras, el lector los lee como
   bueno y malo aunque nadie lo haya querido, y por eso la ADR prohíbe el color y no la
   intención. La paleta de `/actividad` se elige entre los tokens que no caen en esas dos
   franjas; los tokens viven en `@theme` de `app/globals.css` y `:root` no genera utilidades.
3. **Cero comparación contra el periodo anterior como juicio.** «Marzo tuvo más que febrero»
   es legítimo: es una tendencia dentro de una serie propia. «+12% vs. febrero», «mejor mes»,
   «récord» y «por debajo de la media» no lo son.

**Cómo se comprueba.** Buscar en la pantalla renderizada: glifos y SVG de flecha; valores de
`color`, `background-color` y `border-color` en la franja verde o roja **en cualquier nodo**,
sin preguntarse para qué se puso ahí; y todo texto de comparación. Los tres barridos, no uno.

**Cómo se rompe.** Un delta calculado en el componente «porque el dato ya está ahí». La
disponibilidad del dato anterior no autoriza el juicio.

### 2.3 Regla 3 — Sin ranking ni orden descendente por magnitud

> «Sin ranking ni orden descendente por magnitud en ninguna lista de proyectos, periodos o
> lenguajes. El orden es cronológico o del Registry.»

**Requisito.** Toda lista de `/actividad` se ordena **cronológicamente** (periodos) o **en
orden de Registry** (proyectos, claims). Nunca por el valor de una cifra, en ninguna
dirección — descendente es un ranking y ascendente es el mismo ranking al revés. Sin números
de posición, sin «top», sin medallas, sin destacar el mayor.

**Cómo se comprueba.** Leer la primera columna de arriba abajo: si es una secuencia monótona de
la columna numérica, está ordenada por magnitud. Y la pantalla **declara su criterio de orden
en texto**, igual que `/evidencia` declara el suyo (`docs/05` § *Orden y agrupación*).

**Cómo se rompe.** Un encabezado de columna clicable que ordena por valor. Un orden que el
usuario elige sigue siendo un ranking que la pantalla construye: **no hay ordenación
interactiva por magnitud en `/actividad`.**

### 2.4 Regla 4 — Sin barras de progreso, sin porcentajes de completitud, sin rachas

> «Sin barras de progreso, sin porcentajes de completitud, sin rachas. Una racha premia la
> continuidad por sí misma, que es una calificación disfrazada de dato.»

**Requisito**, en sus tres partes:

1. **Sin barras de progreso**: ningún `<progress>`, `<meter>`, ni barra proporcional a una
   cifra. Incluye barras horizontales en una tabla. Es coherente con `docs/02` §6, que ya
   prohíbe la estética de barra de progreso en el sistema de evidencia.
2. **Sin porcentajes de completitud**: ninguna cifra presentada como fracción de un total que
   representaría «todo el trabajo». No existe ese denominador.
3. **Sin rachas**: ni días consecutivos, ni semanas activas seguidas, ni «meses sin hueco».
   `streak` está prohibido permanentemente en el contrato (`docs/05` § *Prohibido en el
   contrato*), y la prohibición aplica al cálculo en pantalla, no solo al campo.

**Cómo se comprueba mirando la pantalla.** Tres barridos sobre el DOM renderizado, uno por
parte: (a) ningún `<progress>` ni `<meter>`, y ningún elemento cuyo `width` o `height` sea
proporcional a una cifra —se comprueba comparando la dimensión computada de dos filas con
valores distintos; si la razón entre dimensiones reproduce la razón entre cifras, es una barra;
(b) ningún `%` cuyo denominador sea un total de trabajo; (c) ningún texto de días, semanas o
meses consecutivos, y ningún cálculo de consecutividad en el componente.

**Cómo se rompe.** Una tira de periodos donde los que tienen dato se pintan distinto de los
huecos **y están contiguos** dibuja una racha sin llamarla así. El hueco se rotula como hueco
(§5), no como interrupción de una serie buena.

### 2.5 Regla 5 — Sin contadores animados

> «Sin contadores animados. Un número que sube solo está actuando un logro.»

**Requisito.** Toda cifra se renderiza en su valor final desde el primer fotograma. Sin
*count-up*, sin interpolación, sin `transition` sobre el texto de un numeral, sin barrido de
entrada por elemento en una tabla de cifras.

**Cómo se comprueba.** Cargar la ruta y leer el numeral **en el primer fotograma pintado**; y
de nuevo un segundo después. Mismo valor. Un fotograma del medio no describe el comportamiento:
hay que mirar el primero.

**Refuerzo que ya está en el contrato.** `docs/05` § Contrato de presentación: **no hay estado
de carga**, porque el sitio es estático y todo se resuelve en build. Un skeleton o un `0` que
se rellena es una mentira sobre cómo funciona el sistema, y además hace que la cifra «suba».

### 2.6 Regla 6 — Toda cifra lleva su detalle accesible, y el detalle incluye qué NO cubre

> «Toda cifra lleva su detalle accesible, y el detalle incluye qué **no** cubre.»

**Requisito**, y son cuatro partes que se cumplen juntas:

1. **Toda** cifra tiene detalle. Ninguna excepción: una cifra sin detalle no se publica.
2. El detalle dice **su fuente**, **su periodo**, **su unidad**, **su cobertura** y **qué
   queda fuera**. La cobertura va **junto al número, no en una nota al pie**
   (`decisions/0015` §3, condición 4).
3. El detalle **no repite la cifra más grande**: eso es lo que `0015` §4-bis marca como no
   permitido. Aporta lo que la cifra no dice.
4. **Accesible** significa alcanzable por teclado, con foco visible, y anunciado por lector de
   pantalla. Si es un `<details>`, su estado se refleja en `aria-expanded`.

**Qué significa «qué no cubre», con los límites ya medidos.** No es una frase genérica: sale de
`docs/plataforma/03-catalogo-de-metricas.md`. Ejemplos de lo que un detalle honesto tiene que
decir:

- De una cifra de tiempo en editor (M-21): que mide **actividad en un editor instrumentado**,
  que su cobertura temporal fue **28 de 31 días**, que **la fracción del trabajo real que cubre
  es desconocida**, y que **un día sin registro no es un día sin trabajo**.
- De un bucket de actividad: de qué `claim_ids` cuelga, que los buckets bajo umbral o en la
  banda de la regla 7 de `docs/03` §3 **se omiten** — así que la serie no es exhaustiva — y que
  la omisión no se anota en el feed.
- De cualquier cifra de GitHub: que cubre los repositorios medidos y no «todo el trabajo», y
  que un repositorio accesible no es un proyecto atribuible (§3.3).

**Cómo se comprueba mirando la pantalla.** Se enumera **toda** cifra visible y se recorre una
por una: cada una tiene que tener detalle alcanzable, y el detalle tiene que contener las cinco
piezas (fuente, periodo, unidad, cobertura, qué queda fuera). **El conteo es el criterio:
cifras con detalle completo = cifras visibles, o FAIL.** Una sola cifra sin detalle rompe la
regla, porque la regla dice «toda». Y se recorre con teclado: si una pieza de detalle no se
alcanza sin ratón, no está accesible.

**Cómo se rompe.** El detalle que repite la cifra en grande y añade «datos de GitHub». Tiene
forma de detalle y no aporta ninguna de las cinco piezas — es lo que `0015` §4-bis marca como
«un detalle que solo repita la cifra más grande». La otra vía: mandar la cobertura a una nota
al pie o a una página de metodología, cuando `0015` §3 condición 4 exige que vaya **junto al
número**.

**Y una consecuencia que no se negocia:** `decisions/0015` §3 condición 6 exige que la interfaz
**diga** que estas cifras no implican competencia, calidad ni seniority. No se deja implícito.
Va en la pantalla, no solo aquí.

### 2.7 La regla de la serie temporal: completa, con sus huecos visibles

> «Una serie se dibuja **completa, con sus huecos visibles**. Un mes sin dato no se dibuja como
> cero ni se interpola: se marca como sin dato. Recortar la serie al tramo favorable es
> construir una tendencia, no mostrarla.»

Cuatro requisitos, y ninguno es reformulación de otro:

1. **Completa.** El eje temporal abarca todo el rango en que la fuente pudo haber medido, no
   solo los periodos con dato. Sin recorte al tramo favorable, y el rango se declara en texto.
2. **Un periodo sin dato no se dibuja como cero.** Ni punto en la línea base, ni barra de
   altura cero, ni celda con `0`.
3. **No se interpola.** La línea **se interrumpe** en el hueco. Unir los dos puntos vecinos
   inventa el valor de en medio; es el caso más difícil de detectar porque el resultado se ve
   correcto.
4. **El hueco se marca como sin dato**, con rótulo legible, y su motivo alcanzable (§5).

**Por qué esta regla sola justifica la spec.** `03-catalogo-de-metricas.md` § *Cero vs
desconocido* midió el caso: **M-13 va de 0 % a 100 % según el repositorio, y una serie de eso
contaría una historia de adopción creciente de IA que no ocurrió** — lo que cambió fue cuándo
se activó el trailer. Es un cero por falta de fuente disfrazado de medición. Y de M-21: un día
sin horas puede ser descanso, clase presencial u otra máquina, y los tres se dibujan igual.

**La regla que cruza esto y §5, literal de `0015` §4-ter:** *una fuente ausente sigue siendo un
dato desconocido.* No es cero, no es «pendiente», no es «próximamente».

---

## 3. Las cuatro distinciones que la interfaz no puede colapsar

`decisions/0015` §4-ter las nombra una por una y advierte que **son fáciles de fundir por
descuido**. Van aquí como **cuatro bloques separados y rotulados**, y así van en la pantalla:
si dos de estas magnitudes aparecen en `/actividad`, aparecen en bloques distintos, cada uno
con su rótulo.

### 3.1 Consumo ≠ resultado

> «El consumo no se publica. `tokens_used` sigue prohibido en cualquier clase. Nunca se
> presenta un consumo junto a un entregable como si lo explicara.»

**Requisito.** `/actividad` **no publica consumo**: ni tokens, ni llamadas a herramientas, ni
peticiones a API, ni coste. `tokens_used`, `prompts`, `agent_sessions` y `tool_calls` están
prohibidos en el contrato de forma permanente (`docs/05` § *Prohibido en el contrato*), y
`decisions/0015` §2 mantiene `tokens_used` y `prompts` prohibidos **en cualquier clase** —
incluida la declaración de proceso.

**Y la parte que se rompe sin publicar consumo:** ningún elemento de consumo se coloca junto a
un entregable **como si lo explicara**. Adyacencia es afirmación causal en una pantalla.

### 3.2 Horas de agente ≠ horas humanas

> «Nunca en el mismo total, nunca en la misma serie, nunca en el mismo eje. Unidades distintas
> de cosas distintas. Si van en la misma pantalla, van en bloques separados y rotulados.»

**Requisito, en sus cuatro partes, y las cuatro se comprueban mirando la pantalla:**

1. **Nunca en el mismo total.** No existe una cifra que sume horas humanas y duración de
   agentes. `decisions/0015` §3 condición 2: «nunca se suman clases distintas».
2. **Nunca en la misma serie.** No comparten línea, ni barra apilada, ni fila de tabla.
3. **Nunca en el mismo eje.** Ni el mismo eje, ni dos ejes en el mismo gráfico: un eje
   secundario es la forma culta de superponerlas, y superponer invita a leer una contra otra.
4. **Bloques separados y rotulados**, cada uno con su unidad declarada y su cobertura.

**Prohibición derivada, y es la tentación real:** ningún ratio entre las dos. Horas por commit,
horas por PR, «horas ahorradas», «% de trabajo hecho por IA» — los cuatro están prohibidos por
`decisions/0015` §3, y `03-catalogo-de-metricas.md` § *Lo prohibido* advierte que con M-21 ya
existiendo, la aritmética es **más tentadora, no menos prohibida**. Tener numerador y
denominador no convierte un cociente en un hecho.

**Medido, y cambia lo que la pantalla puede mostrar:** existe fuente de tiempo humano (M-21,
WakaTime, desde el 2026-09-14, cobertura parcial) y **no existe ninguna de duración de
agentes** (M-23). Así que hoy este bloque tiene un lado con dato y otro que es un hueco
declarado. `decisions/0015` § *Consecuencias* lo anticipa: **autorizar publicar tiempo
registrado no hace que exista tiempo registrado.**

Y `decisions/0015` §3 condición 3: **duración acumulada ≠ tiempo transcurrido**, y la unidad
se declara siempre.

### 3.3 Repositorio accesible ≠ proyecto atribuible

> «Tener acceso a un repositorio no significa haberlo hecho. Un proyecto con varios autores no
> es contribución personal, y la cifra lo dice o no se publica.»

**Requisito.** Ninguna cifra de `/actividad` se presenta sobre «los repositorios» sin declarar
**qué es lo medido**. Concretamente:

1. Nunca se publica un conteo de repositorios accesibles como si midiera trabajo hecho.
2. Toda cifra agregada sobre varios repositorios dice **sobre cuántos y cuáles** se midió y
   **qué queda fuera** — `03-catalogo-de-metricas.md` § *Repos medidos contra repos accesibles*
   ya separa los dos conjuntos.
3. **«La cifra lo dice o no se publica.»** Es una condición de publicación, no una nota
   deseable: si el detalle no puede declarar la atribución, la cifra no aparece.
4. Este repositorio es **público**: no se nombran repositorios no públicos, ni se publica el
   número total de repositorios, ni el reparto público/privado
   (`docs/plataforma/00-resumen-de-entrega.md`, verificado por
   `node scripts/auditoria-exposicion.mjs`).

### 3.4 Trabajo colectivo ≠ contribución personal

> «Donde el trabajo es de equipo, se atribuye al equipo. El porcentaje de autoría dentro de un
> repositorio con más gente **no se publica**: revela composición de equipo ajena.»

**Requisito.** Donde el trabajo es de equipo, la pantalla lo atribuye al equipo. Y en
particular:

1. **El porcentaje de autoría dentro de un repositorio compartido no se publica.** Ni como
   porcentaje, ni como fracción, ni como «N de M commits». Es dato de terceros que no
   consintieron.
2. No se publica número de colaboradores, ni su distribución, ni nada que permita inferir la
   composición del equipo — es un cruce reidentificante (`docs/03` §3, regla 8).
3. Una cifra de un proyecto colectivo se rotula como del proyecto, **no de Rodrigo**.
4. Sigue vigente **«no existe un número que resuma a una persona»** (`docs/02:482`): ninguna
   cifra de `/actividad` se agrega en un índice global del sujeto. `decisions/0015` §2 lo
   conserva explícitamente.

---

## 4. Filtros

Las autorizaciones **D** y **E** de `decisions/0015` §4 se aterrizan aquí, y **la superficie
importa tanto como el filtro**: son autorizaciones acotadas por ruta.

| Filtro | Autorización | `/proyectos` | `/actividad` | `/evidencia` | `/noticias` |
|---|---|---|---|---|---|
| Por **proyecto** | D — «Ninguna. No existía prohibición» | Sí | Sí | **No** | No aplica |
| Por **periodo** | D | Sí | Sí | **No** | No |
| Por **dimensión** | E — acota `docs/05` § *Orden y agrupación* | Sí | Sí | **No** | No |

### 4.1 Por dimensión: solo en `/proyectos` y `/actividad`

La regla que se acota está en `docs/05-feed-contract.md` § Contrato de presentación →
*Orden y agrupación* (hoy `docs/05:433`; `decisions/0015` §4-E la cita como `05:415-416`, otra
referencia derivada — misma causa que §1.2, y por eso aquí se cita por sección):

> «`dimension` es una **etiqueta, no un filtro**. Un control que filtra un elemento por opción
> convierte la dimensión en un eje de comparación.»

**`decisions/0015` §4-E acota esa regla a `/proyectos` y `/actividad`, y solo ahí.** Fuera de
esas dos rutas sigue entera. La dimensión es la del `Claim` (`docs/05`: `dimension:
build|lead|teach`), que es un campo que ya existe: **filtrar no añade nada al contrato.**

### 4.2 El control NO muestra conteos por opción

`decisions/0015` §4-bis lo tabula como prohibido —«Filtrar y que el control **muestre conteos
por opción**»— y §4-E explica por qué: **«eso sí sería el eje de comparación que la regla
evita».**

| Permitido | Prohibido |
|---|---|
| `Construyo` · `Dirijo` · `Formo` | `Construyo (5)` · `Dirijo (4)` · `Formo (3)` |
| Decir cuántos resultados hay **después** de aplicar el filtro: «3 proyectos» | Cualquier cifra **dentro del control**, adyacente a una opción, o en su `title`/`aria-label` |
| `aria-pressed` para el estado del control | Ordenar las opciones por su número de resultados |

**La distinción es fina y es la que se rompe.** Un recuento de resultados describe lo que estás
viendo. Un conteo por opción pone las tres dimensiones una al lado de otra con su número, y eso
las ordena: es el ranking de §2.3 metido en un control de filtro. El prototipo registra
«recuento actualizado» en `00-resumen-de-entrega.md` — **legítimo si es el recuento de
resultados, FAIL si es por opción.** Se verifica mirando el control, no el registro.

Corolario de §2.3: **las opciones van en el orden del contrato** (`build`, `lead`, `teach`),
nunca por magnitud.

### 4.3 `/evidencia` conserva índice sin filtros y en orden de Registry

**En `/evidencia` no hay ningún filtro. Ni por dimensión, ni por proyecto, ni por periodo, ni
por procedencia, ni por verificabilidad.** El índice se presenta completo, **en orden de
Registry, y la página lo dice** (`docs/05` § *Orden y agrupación*).

Tres razones, y ninguna es inercia:

1. `decisions/0015` §4-E concede la autorización **con** esta reserva literal: «`/evidencia`
   conserva el índice sin filtros y en orden de Registry». La autorización y su límite son la
   misma frase.
2. Filtrar por los ejes de `/evidencia` construiría la rampa que `docs/05` prohíbe: los cuatro
   valores de cada eje se renderizan **con el mismo peso**, y un filtro que aísla
   `third_party_public` los ordena por calidad.
3. `/evidencia` es el índice canónico. Un índice canónico filtrado no es un índice: es una
   vista, y el lector no sabe qué no está viendo.

**Y `/actividad` enlaza a `/evidencia`** (`decisions/0015` §4-F), que es donde el lector ve el
conjunto completo sin recortar.

### 4.4 Requisitos comunes a todo filtro

1. **Estado vacío honesto.** Una combinación sin resultados dice que no hay resultados **para
   ese filtro**, y ofrece limpiarlo. Nunca «no hay actividad»: sería afirmar sobre el mundo lo
   que es un efecto del control.
2. **El filtro no cambia el criterio de orden** (§2.3).
3. **Un filtro no oculta un hueco.** Los periodos sin dato del subconjunto filtrado siguen
   rotulados como huecos (§5). Filtrar no es una vía para que la serie se vea completa.
4. **Sin filtro por defecto.** La primera carga muestra el conjunto completo; un filtro
   preseleccionado es una vista editorializada que el lector no eligió.
5. **Operable por teclado**, con foco visible y estado anunciado.
6. **No se codifica un filtro en la URL de `/evidencia`.** Un parámetro que no filtra nada
   invita a implementarlo después.

---

## 5. Estado de dato ausente: qué se renderiza cuando no hay dato

Esta sección gobierna las tres rutas. Es la parte de la spec que más importa **porque es el
estado en que las tres arrancan.**

### 5.1 La regla

`decisions/0015` §4-ter, literal, y aplica a todo lo de aquí:

> «Una fuente ausente sigue siendo un dato desconocido. No es cero, no es «pendiente», no es
> «próximamente». Un hueco se rotula como hueco, se dice por qué, y **nunca se rellena** — ni
> con una estimación, ni con una interpolación, ni con un guion que parezca un valor.»

Los cuatro rellenos prohibidos, explícitos, porque cada uno tiene su forma de colarse:

| Prohibido | Por qué |
|---|---|
| **Un cero** | «0 commits» afirma que no hubo trabajo. `docs/05` lo dice del bucket bajo umbral: «un cero implicaría *no hubo trabajo*, que sería falso» |
| **Una estimación** | Es inferencia, y `decisions/0015` §5 no autoriza ninguna |
| **Una interpolación** | Inventa el valor intermedio y se ve correcta (§2.7) |
| **Un guion que parezca un valor** | Un `—` en una celda de cifras se lee como cifra. Si el hueco se rotula, se rotula con palabras |

Y la forma positiva, que es la que evita la salida por defecto de la industria: `docs/05`
§ Contrato de presentación → *El encuadre* ya la fijó para la evidencia y aplica igual aquí —
**la ausencia no es un hueco a la espera de datos: es el contenido.** Una prohibición sin forma
positiva produce «un chip gris, un guion, un `0`, o un vacío con la palabra *Próximamente*».

### 5.2 Un hueco se rotula como hueco y dice por qué

Tres requisitos por hueco:

1. **Rótulo legible**, en palabras, no un símbolo. Dice que no hay dato.
2. **El motivo, alcanzable desde el hueco.** Y el motivo es **específico de esa fuente**,
   nunca una plantilla — es la misma exigencia que `docs/05` impone a «por qué hoy no puedes
   comprobarlo»: «una frase declarada y específica de ese claim, nunca una plantilla».
3. **Distinguible de un cero medido, visualmente.** `03-catalogo-de-metricas.md` § *Cero vs
   desconocido* es tajante: «un cero medido y un cero por falta de fuente se ven igual en una
   pantalla y significan lo opuesto. **La pantalla debe distinguirlos visualmente; si no puede,
   no muestra ninguno de los dos.**» Esa última cláusula es normativa aquí: **ante la duda, no
   se muestra.**

Hay ceros que **sí** son el dato y se muestran como cifra, no como hueco: 0 reviews emitidas, 0
releases, 0 tags, 0 evidencia en el feed. Son ceros medidos, y el detalle de §2.6 dice qué
significa cada uno. Confundir las dos clases en cualquier dirección es un defecto.

### 5.3 `/actividad` hoy: el artefacto no existe

**Medido el 2026-09-17: `public/proof/v1/` contiene `claims.json`, `evidence.json`,
`meta.json` y `projects.json`. No contiene `activity.json`.** Coincide con
`docs/05` § `activity.json` («hoy todavía no existe en el artefacto: el motor aún debe
implementar su emisión») y con `03-catalogo-de-metricas.md`, que registra M-20 como hueco cuya
causa es exactamente «el archivo no existe».

Qué se renderiza:

1. **La ruta existe y responde 200.** No 404 y no redirección: la superficie es el contenido.
   Es el invariante 3 de `docs/04` §4 — el sitio se construye y se sirve sin feed.
2. **Un estado declarado** que dice: no hay artefacto de actividad publicado; el motor de
   evidencia todavía no lo emite; por eso no hay cifras. Sin cifras, sin ceros, sin esqueleto.
3. **Los enlaces a `/evidencia` y `/proyectos` funcionan**, que es lo que el lector puede usar
   hoy.
4. **Ninguna promesa de fecha.** Ni «próximamente», ni «en construcción».
5. **El build no falla y no advierte.** Un `activity.json` ausente es un estado legal del
   contrato, no un error. Que el build lo tratara como fallo forzaría a alguien a crear el
   archivo para desbloquearlo — y `public/proof/v1/**` es zona prohibida.

**Y cuando `activity.json` exista, el estado no desaparece: se vuelve por periodo.** Los
buckets omitidos por umbral, por sujetos independientes o por la banda de la regla 7 de
`docs/03` §3 **no están en el feed y no se anotan ahí**; en la pantalla esos periodos son
huecos, no ceros. `docs/05` lo dice: «la ausencia no se rellena con ceros ni se anota». La
pantalla no puede distinguir un periodo omitido por privacidad de uno sin actividad: **por eso
el rótulo dice «sin dato publicado», que es lo que la pantalla sabe**, y no inventa la causa.

### 5.4 `/noticias` hoy: el corpus no tiene ninguna pieza publicada

**Medido el 2026-09-17: tres piezas en el corpus, las tres en `estado: "borrador"`.** Y
`02-editorial.md` §3 declara `"borrador"` como único valor permitido hoy, con
`procedencia.publicado: "pendiente"` en todo el corpus.

Qué se renderiza:

1. **`/noticias` responde 200 con su estado vacío declarado**: el canal existe y no hay
   ninguna pieza publicada todavía. Sin conteo de borradores — publicaría su existencia.
2. **`/noticias/[slug]` no tiene ninguna ruta.** `generateStaticParams` devuelve vacío. Cada
   slug de borrador responde **404**.
3. **Ni un fragmento de borrador llega al HTML**, tampoco en un `<script>` de datos ni en un
   comentario. Este repositorio es público: lo que se commitea, se publica.
4. **Sin fechas prometidas.** `02-editorial.md` §7: si en una semana no hay nada que resista
   las cinco preguntas, no se publica nada esa semana. Un canal sin cadencia prometida no está
   atrasado.

### 5.5 Este es el estado CORRECTO del sistema hoy, y no un defecto pendiente

**Declaración normativa, y está aquí para que nadie la trate como deuda.**

El hueco de `/actividad` y el vacío de `/noticias` son el **comportamiento correcto** del
sistema en su estado actual. No son un defecto, no son una entrega incompleta, no son una tarea
abierta, y **no se cierran rellenando la pantalla**.

`decisions/0015` § *Consecuencias*, punto 3, lo decide con estas palabras:

> «**El riesgo de que el permiso se confunda con el dato.** Autorizar publicar tiempo
> registrado no hace que exista tiempo registrado. Si la pantalla muestra un hueco donde debía
> ir esa cifra, **el hueco es el estado correcto del sistema, no un defecto pendiente**.»

Tres consecuencias operativas:

1. **Un hueco no es un bug.** Un reporte que diga «`/actividad` no muestra datos» se cierra
   como *funciona según spec*, con esta sección como referencia. Lo que sí sería un bug: un
   cero donde va un hueco, un guion que parece valor, una interpolación, o un hueco sin motivo.
2. **La forma no cambia el día que llegue el dato.** Es el argumento que `docs/05` ya usa para
   los dos ejes: «la forma **no cambia** el día que aparezca un claim `third_party_public`: si
   cambiara, el lector aprendería que la forma de hoy era la mala». Igual aquí: si el estado de
   dato ausente se diseña como algo provisional y luego se reemplaza, se admite que hoy se está
   mostrando algo peor que la verdad.
3. **Lo que sí está pendiente es de otro actor, y no es esta spec.** Emitir `activity.json` es
   del motor (`proof-engine`, repo privado). Publicar una pieza es de Rodrigo. `public/proof/v1/**`
   es **zona prohibida** para el Builder de este repositorio: no se crea un `activity.json` «de
   prueba» para ver la pantalla. Para desarrollar y probar existe **`PROOF_FEED_DIR`**, y el
   lector resuelve su raíz desde esa variable.

---

## 6. Datos que `/actividad` necesitaría y hoy no existen

**Esta spec no introduce ningún campo ni valor nuevo en el feed público.** `/actividad` se
construye con lo que `docs/05-feed-contract.md` ya define, y nada más. Los campos que consume
son los que ese contrato declara para `activity.json` —`schema_version` y `buckets[]` con
`period`, `claim_ids`, `project_id` opcional, `counts` de los cinco enteros y
`visibility_scope`— y `claims.json` para resolver el claim. **No se añade ni uno.**

Lo que falta se **nombra y se remite al contrato**, con su identificador del catálogo:

| Lo que la pantalla querría | Identificador | Estado medido | Dónde se decide |
|---|---|---|---|
| Buckets de actividad por periodo | **M-20** | **El archivo no existe** en `public/proof/v1/` | Ya está en el contrato (`docs/05` § `activity.json`). Falta **emitirlo**, y es del motor |
| Número de ejecuciones de agentes | **M-22** | **DATO INEXISTENTE.** El `ledger/` del motor es un `.gitkeep` de 0 bytes | `agent_sessions` está **prohibido en el contrato**. Publicar algo equivalente exige decisión humana |
| Duración de las ejecuciones de agentes | **M-23** | **DATO INEXISTENTE.** No hay reloj que las mida | Igual que M-22. `decisions/0015` §4-C abre el permiso de la clase; **no crea el dato** |
| Tiempo humano registrado | **M-21** | **Existe**, con cobertura parcial: 28 de 31 días, fracción del trabajo real **desconocida** | Autorizado como **declaración de proceso** (`0015` §4-C). `hours` sigue prohibido **como métrica** |
| Detalle individual detrás de una cifra | **M-19** | **Bloqueado, no vacío.** `evidence.json` está vacío; el motor aborta si llega evidencia | `decisions/0013`, ACEPTADA. El mecanismo no está implementado y ningún proyecto declara `publish_evidence` |
| Capturas y demos de producto | **M-24** | **Cero medido** sobre el 100 % del repositorio | Son activos, no contrato. La «presencia visual plena» de `0015` §4-F **no tiene hoy un solo activo que mostrar** |

**Las tres reglas que gobiernan esta tabla:**

1. **Un dato que no existe no se inventa aquí.** Se nombra, se remite y la pantalla muestra su
   hueco (§5). Esta spec no propone campos, no propone nombres y no reserva formas —
   `docs/05` ya eliminó `assistance` precisamente por ser «un campo definido para un consumidor
   que no existe».
2. **Cambiar el schema del feed, o publicar un campo o un valor nuevo, escala a un humano.**
   Está en `AGENTS.md` → *Escalar a un humano* y lo reitera `docs/05`: «ningún agente decide la
   forma del contrato público». Un PR que implemente `/actividad` y toque el contrato del feed
   es un defecto por construcción.
3. **No se elude por la vía del nombre ni de la ruta.** `decisions/0015` § *Alternativas
   descartadas* (c) cita a Rodrigo: «No eludas restricciones cambiando nombres o moviendo datos
   a otra ruta», y `AGENTS.md:61` manda buscar exactamente eso. La prueba, de `0015`
   § *Consecuencias*: **si el número dice algo sobre el sujeto del portafolio, es métrica de
   evidencia, se llame como se llame** — y entonces necesita `claim_ids`.

**Y la regla estructural que no admite excepción:** ninguna métrica de evidencia sin
`claim_ids`. Un bucket de actividad **es** métrica de evidencia (`docs/05` § `activity.json`),
así que `/actividad` no puede renderizar ningún agregado global: si un periodo no sostiene
ninguna afirmación, no está en el feed y la pantalla no lo construye. **La actividad no es el
producto.**

---

## 7. Fuera de alcance, dicho explícitamente

- **La implementación.** Esta entrega escribe spec. No crea `app/noticias`, `app/actividad` ni
  ningún componente, y no toca `app/` ni `components/`.
- **El copy.** Autoridad de `docs/brand/03-copy-deck.md`. Aquí se fija **qué** tiene que decir
  cada aviso y cada rótulo, nunca con qué palabras.
- **Emitir `activity.json`.** Es del motor de evidencia, en su repositorio privado.
- **Publicar cualquier pieza editorial.** Decisión de Rodrigo (`02-editorial.md` §4).
- **Corregir las citas `03:136` y `05:415-416`** en `decisions/0015` y en
  `docs/plataforma/02-editorial.md` §0. Quedan registradas en §1.2 y §4.1 como referencias
  derivadas; enmendar esos documentos es trabajo suyo, no de esta spec.
- **Marca y dominio propios del canal editorial.** `decisions/0015` § *Alternativas descartadas*
  (d) lo deja como opción abierta, no como decisión tomada.
- **Las cinco pantallas del prototipo** no se promueven a producción por este documento. Son
  referencia no normativa.

---

## Referencias

- `decisions/0015-actividad-proceso-y-editorial.md` — §3 (las seis condiciones de la clase de
  proceso), §4 (autorizaciones A–G), **§4-bis** (las seis reglas de forma y la serie temporal),
  **§4-ter** (las cuatro distinciones), §5 (lo que no autoriza), § *Consecuencias*
- `decisions/0013-autorizar-la-publicacion-de-evidencia.md` — hasta dónde llega el detalle
- `decisions/0006-four-dimension-project-classification.md` — clasificación de `Project`
- `docs/03-privacy-and-publication-policy.md` — §2 y §3 (qué se puede publicar), **§4** (la
  frontera editorial, hoy `docs/03:194`)
- `docs/05-feed-contract.md` — § `activity.json`, § *Prohibido en el contrato*,
  § Contrato de presentación (incluida *Orden y agrupación*, hoy `docs/05:433`)
- `docs/02-domain-and-evidence-model.md` — §6 (lo prohibido en la presentación), §7 (las tres
  clases de cifra)
- `docs/04-architecture.md` — §4 invariante 3 (el sitio se construye sin feed), invariante 4 y
  §4.1 (qué cubre cada guard y qué no)
- `docs/brand/02-arquitectura-y-urls.md` — §1 (mapa de rutas), §2 (navegación), §3 (la frontera
  del funnel), §4 (sitemap), §5 (metadatos)
- `docs/plataforma/02-editorial.md` — esquema editorial, fuentes, canal y cadencia
- `docs/plataforma/03-catalogo-de-metricas.md` — § *Vacíos*, § *Lo prohibido*, **§ *Cero vs
  desconocido***, § *Cobertura*
- `docs/plataforma/prototipo/` — referencia **no normativa**
