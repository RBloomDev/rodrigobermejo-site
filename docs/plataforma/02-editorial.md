# 02 — Canal editorial: noticias y análisis de IA, software y educación en México

> **Estado: autoridad desde 2026-09-15 (ADR 0015 ACEPTADA).** La aceptación autoriza la
> plataforma editorial y vuelve normativa esta spec; no afirma que esté implementada ni
> publicada. Ninguna pieza producida bajo esta spec sale del estado de borrador sin
> decisión de Rodrigo.

---

## 0. Qué es y para quién

Un canal de **noticias y análisis de IA, software y educación con foco en México**, para
quien **dirige tecnología, construye productos o forma talento**. No es un blog de
opinión ni un agregador.

**Vive dentro del sitio** para esta entrega. No se decide marca ni dominio propios ahora:
demostrar el producto no requiere esa decisión, y tomarla sin necesidad sería
comprometer algo reversible por adelantado.

### La frontera que no se cruza

`docs/03-privacy-and-publication-policy.md` §4, tabla «Fronteras que nunca se cruzan», es
explícito y no se toca. Se cita **por sección**: una línea se desplaza al crecer el
documento, una sección no.

> «Contenido editorial (`content/`) → Evidencia: El blog puede *enlazar* a evidencia;
> **jamás derivarse de ella ni alimentarla.**»

Traducción operativa: una pieza editorial **no** es evidencia del trabajo de Rodrigo, y
la evidencia **no** es material editorial. Publicar veinte análisis no prueba nada sobre
su competencia, y el sistema no debe insinuarlo. La única vía por la que los dos
registros se tocan es la **declaración de relación** (§4).

---

## 1. Lo que aprendimos de RuntimeWire

Se revisó `runtimewire.com` a fondo el 2026-09-13, midiendo contra su código y sus datos
crudos, no contra lo que declara. Tres cosas se adoptan, tres no.

### Se adopta

**El Reporting Record como campo estructurado, no como prosa.** Es su mejor pieza de
ingeniería: un bloque con `finding`, `evidenceSummary`, `methodology`,
`reproductionStatus`, `companyResponseStatus`, `companyContactedAt`, `timeline`,
`corrections`. Si se valida en CI, una pieza sin él no pasa el gate — es la diferencia
entre una política y un mecanismo.

**La lista explícita de lo que la evidencia NO establece.** Su investigación mejor
construida dedica un bloque a decir qué *no* probó: *«I have not yet shown that every
Kimi message is copied… I do not know Kimi's retention configuration.»* Va pegada al
hallazgo, no en un recuadro genérico.

**Procedencia de cuatro etapas con el nombre del modelo**: `sourced`, `written`,
`edited`, `published`, cada una humano o IA. Es la divulgación de IA más honesta que
se encontró. **Con un cambio: abierta por defecto.** Ellos la colapsan, así que el lector
tiene que hacer clic para enterarse de que nadie revisó la nota.

### No se adopta, y por qué

**Declarar etiquetas que no se implementan.** Es su peor defecto: declaran cinco
etiquetas editoriales en su política y **cero** existen en su código. Su columna dominical
—opinión explícita— sale marcada como `wire`, sin forma de que el lector lo sepa.
**Regla de este canal: si no renderiza, no se declara.** Y aquí la etiqueta de opinión
importa más que allá, porque Rodrigo escribe desde el rol de CTO sobre un mercado del que
es actor.

**La autopublicación sin humano.** 7 de cada 10 de sus notas se publican solas, y eso es
lo que produjo un `[COMPANY RESPONSE PLACEHOLDER]` servido en producción. En un sitio
personal el costo reputacional no se diluye entre 2,980 notas.

**Su cadencia.** Publican 2,980 notas para 703 suscriptores: una conversión de 0.171%.
Y sus propios datos públicos dicen que **una investigación humana rinde 10.5× una nota
automatizada** — 1,109 lecturas de media frente a 105. Las 47 investigaciones son el 1.7%
del volumen y el 15.6% de las lecturas. **Este canal apunta a las 47, no a las 2,680.**

---

## 2. Las cinco preguntas, como esquema

Toda pieza resuelve las cinco. No son una guía de estilo: son campos, y una pieza sin
ellos no se renderiza.

| Pregunta de Rodrigo | Campo | Obligatorio |
|---|---|---|
| Qué ocurrió y cuándo | `hecho` + `ocurrido_en` | Sí |
| Qué fuentes lo sostienen | `fuentes[]` + `fuente_primaria` | Sí, mínimo 2 |
| Qué cambia para el lector | `que_cambia` | Sí |
| Qué aplicación o limitación tiene **en México** | `mexico` | Sí, **incluso cuando la respuesta es que no se sabe** |
| Qué sigue siendo incierto | `no_establece[]` | Sí, mínimo 1 |

### El campo `mexico` — el que RuntimeWire no tiene

Rodrigo lo pidió con una condición: *«cuando exista evidencia»*. Sin un estado explícito,
«en México» se convierte en relleno retórico en cuanto no hay dato local. Por eso el campo
lleva **estado obligatorio**, imitando su `reproductionStatus`:

| Estado | Significa |
|---|---|
| `aplica_con_datos_locales` | Hay evidencia mexicana concreta y se cita |
| `aplica_sin_datos_locales` | El hecho aplica por su naturaleza, pero no hay medición local |
| `no_aplica` | El hecho no tiene efecto aquí, y se dice por qué |
| `no_verificado` | No se ha comprobado. **Es un valor legítimo y se publica como tal** |

`no_verificado` es el que salva la sección. Sin él, la única salida honesta sería omitir
la pregunta, y la pregunta es medio producto.

---

## 3. Esquema del registro editorial

Este apartado define **la forma** del registro, no su ubicación. **Dónde vive cada cosa lo
fija §8, y en eso manda §8**: los borradores **tienen que vivir** en
`$EDITORIAL_REDACCIONES_DIR`, fuera de todo repositorio, y el corpus publicado en
`content/noticias/`, escrito únicamente por el comando de autorización. Ninguna de las dos
ubicaciones existe todavía —el estado está versionado aquí y `content/noticias/` no está
creado (§8.6)—. `docs/plataforma/prototipo/datos/piezas.json` es el fixture del
prototipo —tres piezas, las tres en borrador— y es **referencia no normativa**: es lo que
`01` §1.1 mide hoy, no dónde debe vivir un borrador.

Ninguna pieza se publica sin la autorización de §8.4, que es una decisión de Rodrigo.

```jsonc
{
  "id": "kebab-case-estable",
  "tipo": "noticia" | "analisis" | "opinion",   // renderizado SIEMPRE, visible
  "titulo": "string",
  "entradilla": "string",                        // una frase, con el dato duro
  "estado": "borrador" | "autorizada",           // vocabulario cerrado, §8.2
  "ocurrido_en": "YYYY-MM-DD",                   // cuando paso el hecho
  "redactado_en": "YYYY-MM-DDTHH:MMZ",           // cuando se redacto la pieza
  "hecho": "string",
  "que_cambia": "string",
  "mexico": {
    "estado": "aplica_con_datos_locales" | "aplica_sin_datos_locales"
            | "no_aplica" | "no_verificado",
    "texto": "string"
  },
  "no_establece": ["string"],                    // minimo 1
  "fuente_primaria": { "titulo": "", "medio": "", "url": "", "fecha": "" },
  "fuentes": [ { "titulo": "", "medio": "", "url": "", "fecha": "", "tipo": "primaria"|"secundaria" } ],
  "relacion_declarada": "string | null",         // conflicto de interes, §4
  "procedencia": {
    "detectado":  { "por": "agente", "detalle": "" },
    "redactado":  { "por": "ia", "modelo": "" },
    "verificado": { "por": "humano" | "pendiente", "detalle": "" },
    "publicado":  { "por": "pendiente", "detalle": "" }
  },
  "huella": "sha256:...",                        // para deduplicar, §5
  "correcciones": []
}
```

**Reglas del esquema, y son duras:**

- **`tipo` se renderiza siempre y de forma visible.** Es la regla de §1. Una pieza de
  opinión que no se ve como opinión es el defecto de RuntimeWire.
- **Mínimo dos fuentes.** Con una sola, la pieza no se redacta: se registra el hallazgo y
  se espera corroboración.
- **`no_establece` no puede estar vacío.** Si no se sabe qué no prueba, la pieza no está
  lista.
- **`procedencia.publicado` es `pendiente` mientras la pieza sea borrador.** No hay
  autopublicación, ni la habrá sin decisión de Rodrigo. El único camino por el que ese campo
  deja de ser `pendiente` es el comando de autorización de §8.4, que lo llena con el humano
  que autorizó. Ningún agente lo escribe.
- **Nunca se guarda el prompt, la transcripción ni el contenido generado intermedio.** Se
  guarda el vínculo: qué modelo redactó, no qué se le dijo (`AGENTS.md:60`). La regla es de
  esta sección: no se cita a sí misma por número de línea, porque una línea se desplaza.

---

## 4. Qué no se hace, y no es negociable

- **No se inventan opiniones de Rodrigo.** Una pieza `opinion` se escribe solo si él la
  dicta o la aprueba palabra por palabra. Un agente **no** redacta opinión en su nombre.
- **No se atribuye respaldo institucional de Inadaptados.** Rodrigo es CTO; eso no
  convierte su análisis en postura de la institución.
- **Se declara la relación cuando se cubre trabajo propio**, de Inadaptados o de un
  cliente. Va en la pieza, visible, no en una página de ética aparte.
- **No se reproduce contenido de fuentes que lo prohíben.** Ver §6: la prensa mexicana
  sirve para **detectar** un tema, nunca para reproducirlo.
- **No se publica nada.** Todo el corpus de esta entrega está en `estado: "borrador"`.

### Imágenes: la regla que nace de un defecto ajeno

- **Toda imagen generada con IA se atribuye, con el modelo**, sin excepción. En esto
  RuntimeWire es ejemplar: el 100% de sus ilustraciones lo declara.
- **Pero nunca se ilustra con IA la evidencia de la que depende la afirmación.** Ellos
  publicaron una *«reconstrucción editorial»* generada con IA de una interfaz —en una
  pieza cuya tesis dependía de lo que esa interfaz mostraba—. Está etiquetada, y aun así
  está mal: una reconstrucción no es el artefacto. **Se muestra la captura real o no se
  muestra nada.**
- Esta regla aplica también fuera del canal editorial. `public/images/profile.jpg` lleva
  la marca de agua visible de Google AI y no tiene metadatos de origen; Rodrigo decidió
  el 2026-09-12 usarlo tal cual, con la marca a la vista. Es coherente con la regla
  —nada se oculta— pero conviene tenerlo presente en un sitio cuyo producto es la
  procedencia.

---

## 5. El canal: detección, deduplicación, redacción, verificación

Cinco etapas. La implementación vive en `scripts/editorial/`.

> **Este apartado describe las etapas internas; no dice quién las ejecuta ni dónde
> escriben.** Cómo se agrupan en **tres comandos** —generar, verificar, autorizar—, qué
> escribe cada uno y dónde vive su estado lo fija **§8**, que manda sobre cualquier lectura
> de ubicación que se derive de aquí. **Ninguna de estas cinco etapas debe publicar nada**:
> publicar es la autorización de §8.4 y no ocurre dentro de una corrida. Hoy sí ocurre
> —`ejecutar.mjs:276` escribe el corpus al final de la misma corrida que redacta y
> verifica—, y separarlo es T-E1 (§8.6).

### 5.0 Una sola puerta de red, y por qué está guardada

Todo lo que el canal descarga pasa por `comun.obtener()`, y desde ahí por la guarda de
`red-segura.mjs`. No es celo: **estas URLs no las elegimos nosotros.** Salen de feeds RSS
de terceros y del texto de artículos ajenos que el redactor cita. Son entrada de un
atacante, no configuración.

La versión anterior validaba solo el esquema, y eso no protege de nada:
`http://169.254.169.254/` —el endpoint de metadatos de casi cualquier nube, el que entrega
credenciales de instancia— pasa la comprobación de esquema perfectamente. Se bloquean
loopback, rangos privados, link-local, CGNAT, multicast, IPv4 embebida en IPv6, nombres
reservados y cualquier puerto que no sea 80 o 443.

**Las redirecciones se siguen a mano, revalidando cada salto**, hasta cinco. `redirect:
'follow'` obedece un 302 hacia `http://127.0.0.1:6379/` sin volver a preguntar, y entonces
haber validado la primera URL no habría servido de nada.

Un destino rechazado **no es un fallo de la pieza**: devuelve el código `DESTINO_VETADO`,
que §5.4 clasifica como `no_consultada`. Que nosotros nos neguemos a pedir una URL no
prueba que el documento no exista; prueba que no lo consultamos.

Queda abierto, escrito y aceptado el riesgo residual de **DNS rebinding**: cerrarlo del
todo exige forzar la IP resuelta en la conexión, lo que rompe SNI y hosting virtual —que
es cómo se sirve la mayoría de nuestras fuentes.

### 5.1 Detectar
Lee los feeds autorizados de §6. Registra por cada ítem: título, URL canónica, medio,
fecha de publicación y fecha de lectura. **Nada más.** No se copia el cuerpo de fuentes
que reservan derechos.

### 5.2 Deduplicar
**El requisito que Rodrigo puso como prueba: una segunda ejecución sobre las mismas
entradas no debe duplicar la pieza.**

Tres niveles, en orden:
1. **URL canónica normalizada** — sin `utm_*`, sin fragmento, sin barra final.
2. **Huella de contenido** — `sha256` del título normalizado (minúsculas, sin acentos, sin
   puntuación) más el dominio **de la entrada detectada**.
3. **Registro persistente** — la bitácora append-only de `scripts/editorial/estado/`. Una
   entrada cuya huella ya está registrada **no genera pieza nueva**.

> **Corregido el 2026-09-14, y era un defecto de esta spec, no de la implementación.**
> Este apartado decía «el dominio de **la fuente primaria**». Con esa definición, dos
> hechos distintos que citan el mismo documento producen la misma huella y el segundo se
> descarta como duplicado — que es exactamente lo que Rodrigo puso como quinta prueba de
> recuperación. La identidad de una pieza es **el hecho detectado**, no sus referencias.
>
> Corolario, y va aparte porque es la otra mitad del mismo error: **las referencias de una
> pieza ya publicada no entran al índice de identidad**. Si entraran, citar un documento
> en una pieza bloquearía cualquier pieza futura sobre ese documento.

### 5.3 Redactar
Un modelo redacta el borrador contra el esquema de §3. **Toda cifra y toda fecha que
aparezca en el texto debe existir en alguna de las `fuentes[]`.** Si no, no se escribe.

### 5.4 Verificar hechos
Comprobación explícita de que cada afirmación del borrador tiene fuente, que las URLs
resuelven, y que las fechas coinciden con lo que dice la fuente. El resultado se registra
en `procedencia.verificado`.

### 5.5 Registrar errores — y esta es la otra prueba de Rodrigo
**Un error de acceso queda registrado y NO produce una noticia fabricada.**

- Todo fallo de red, timeout, 403, 404 o certificado inválido se escribe en
  `scripts/editorial/estado/errores.jsonl` con fuente, código, fecha y mensaje.
- **Una fuente caída no se sustituye por conocimiento del modelo.** Si el hecho no se
  pudo leer, no hay pieza.
- Si una fuente cae, la ejecución **termina con éxito parcial** y lo dice: produce lo que
  sí pudo leer y deja constancia de lo que no.

---

## 6. Fuentes: verificadas el 2026-09-13

Cada una probada con petición real. **La licencia determina el uso, no la conveniencia.**

### Reproducibles con atribución — el núcleo

| Fuente | Feed / API | Licencia |
|---|---|---|
| **Observatorio de Innovación Educativa (Tec de Monterrey)** | `observatorio.tec.mx/feed/` · RSS, 200 | **CC BY 4.0.** *«son libres de copiar, distribuir y comunicar públicamente todos nuestros contenidos»* |
| **INEGI** | API de Indicadores, token gratuito | *«Puede explotar comercialmente la información… Debe otorgar los créditos correspondientes al INEGI»* |
| **arXiv** | `rss.arxiv.org/rss/cs.AI`, `cs.LG`, `cs.CY` · 200 | Metadatos **CC0**. Los artículos llevan licencia por autor: se verifica pieza por pieza |
| **Crossref** | `api.crossref.org` · 200 | **CC BY 4.0** |
| **DOAJ** | `doaj.org/api` · 200 | Metadatos **CC0** |
| **Zenodo** | `zenodo.org/api/records` · 200 | Metadatos **CC0** |

El Observatorio del Tec es la fuente más valiosa del conjunto: es exactamente
IA + educación + México, y su licencia permite reproducir.

### Solo para detectar — nunca reproducir

Prensa mexicana e internacional. Sus feeds sirven para saber que un tema existe; el texto
no se copia.

| Fuente | Estado |
|---|---|
| **Expansión** | RSS 200. **Prohíbe el scraping explícitamente** y limita a uso personal no comercial |
| **MIT Technology Review** | RSS 200. *«may not… resell, distribute, or make any commercial use»* |
| **Nexos / Educación** | RSS 200. Todos los derechos reservados |
| **Xataka México**, **Wired en Español**, **LatamList**, **Contxto** | RSS 200, **licencia no verificada** — tratar como reservada |

### Blogs primarios de laboratorios

`openai.com/news/rss.xml` (200) · `deepmind.google/blog/rss.xml` (200) ·
`blog.google/technology/ai/rss/` (200). **Anthropic no tiene RSS** (404) y **Meta AI
tampoco** (404).

### Oficiales mexicanas — corregido tras una segunda verificación

> **Corrección del 2026-09-13.** La primera versión de esta sección decía que el DOF
> tenía el certificado TLS roto y que `datos.gob.mx` estaba caído. **Las dos afirmaciones
> eran falsas**, y venían de probar la URL equivocada. Se corrigen aquí en vez de
> borrarse, porque el error importa: por poco se descarta la única fuente oficial
> mexicana con cadencia diaria.

| Fuente | Acceso verificado | Licencia |
|---|---|---|
| **DOF** | **No tiene RSS** (404), pero **sí API JSON sin llave**: `sidofqa.segob.gob.mx/dof/sidof/notas/DD-MM-AAAA` → 200 | No declara licencia; es texto legal oficial |
| **datos.gob.mx** | **CKAN sin llave**: `www.datos.gob.mx/api/3/action/package_list` → 200. El subdominio `api.datos.gob.mx` sí está caído — era la URL mal probada | Por dataset. Muchos con `"license_id":"CC-BY-4.0"`, `"isopen":true` |
| **SciELO México** | RSS devuelve **0 items**; **OAI-PMH sí responde**: `scielo.org.mx/oai/scielo-oai.php?verb=Identify` → 200 | CC BY 4.0 |
| **UNESCO UIS** | `api.uis.unesco.org/api/public/data/indicators?geoUnit=MEX` → 200 | CC IGO con atribución **y ShareAlike** |

**El DOF es el motor de la cobertura regulatoria mexicana.** Es lo único oficial con
cadencia diaria verificable.

> **Y un dato que conviene tener delante antes de prometer cobertura regulatoria.**
> Se escaneó la API del DOF del 1 al 13 de septiembre de 2026: **1,007 notas, cero sobre
> inteligencia artificial**. El DOF es el motor porque es lo único con cadencia, no porque
> produzca material de IA con frecuencia. La sección no puede depender de él para su ritmo.

> **Y la consecuencia editorial de fondo:** ninguna fuente entrega hecha la respuesta a
> «qué aplica en México». Sale de cruzar INEGI, `datos.gob.mx` y el Banco Mundial contra
> la novedad global. **El valor mexicano lo pone el análisis, no una fuente que lo
> sirva.** Por eso el campo `mexico` lleva estado: sin él, la pregunta se contestaría con
> retórica cada vez que falte el dato.

### Descartadas, con la falla medida

**El Economista** — `/rss/tecnologia` devuelve **403**, pero `/rss/ultimas-noticias` devuelve **200**. La primera versión de esta sección decía «403 en todas las rutas» y era falso: se probó una sola. Queda como SOLO ENLAZAR por sus términos, no por inaccesible. **Forbes México** — 403, *«invalid or
missing feed token»*: requiere autorización. **Milenio** y **El Universal** — 404.
**SEP y gob.mx** — responden a clientes automatizados con un challenge de F5; sus
términos solo permiten uso personal no comercial. **Senado** — devuelve el interstitial
de Imperva. **INEGI RSS** — no existe: las URLs devuelven el SPA vacío; hay que usar la
API de Indicadores con token.

**IFT** — su RSS responde 200 pero **el último ítem es del 2025-05-13: 489 días
congelado**. El organismo se extinguió en octubre de 2025 y su banco de datos
`bit.ift.org.mx` **ya no resuelve en DNS**, aunque el sitio del regulador lo siga
enlazando.

**SECIHTI** — `secihti.mx/feed/` responde, pero publicó **10 ítems en 101 días** y el
último lleva 54 días. Casi abandonado.

**Contxto** — el feed funciona en `/en/feed/`, pero su `robots.txt` **veta GPTBot,
Google-Extended y CCBot**. No se usa.

**Papers with Code** — ya no existe; redirige a Hugging Face.

**Tres licencias no se pudieron leer** y no se suponen: OCDE y BID devuelven 403 de
Cloudflare, y la declaración CC0 de OpenAlex no está en una página accesible. Si alguna
va a sostener una decisión editorial, se verifica antes.

> **Consecuencia que hay que aceptar:** del lado oficial mexicano, **solo el DOF tiene
> cadencia diaria**. ANUIES, SEP, Senado y Diputados no tienen feed utilizable, y el
> regulador de telecomunicaciones lleva 489 días sin actualizar. La cobertura
> institucional más allá del DOF es esporádica, y el canal lo dice en vez de fingir
> cobertura.

---

## 7. Cadencia

Los datos públicos de RuntimeWire son el argumento: **una investigación rinde 10.5× una
nota de wire**, y su volumen de 2,980 notas convierte al 0.171%.

Este canal se diseña para **pocas piezas, verificadas y firmadas**. No hay meta de
volumen, no hay autopublicación, y no existe un modo «wire». Si en una semana no hay nada
que resista las cinco preguntas, no se publica nada esa semana.

---

## 8. Las tres etapas, y dónde vive el estado de cada una

Las cinco etapas de §5 se agrupan en **tres comandos**. La separación no es organizativa:
es la que hace que «verificado» y «publicado» no puedan confundirse, y la que deja **una
sola** puerta hacia el árbol público del repositorio.

Hoy el canal es **un solo comando** (`node scripts/editorial/ejecutar.mjs`) que detecta,
redacta, verifica y escribe el corpus de un tirón. Esta sección es normativa y ese comando
no la cumple todavía; qué falta y quién lo cierra está en §8.6.

### 8.1 Tres comandos, tres salidas, tres transiciones

| Etapa | Comando | Lee | **Única** salida | Transición |
|---|---|---|---|---|
| **Generar** | `generar` | Feeds de §6 y la bitácora | Un borrador en `$EDITORIAL_REDACCIONES_DIR` y eventos en `$EDITORIAL_ESTADO_DIR` | `detectada → pendiente_redaccion → pendiente_verificacion` |
| **Verificar** | `verificar` | El borrador y sus fuentes | El sello `procedencia.verificado` sobre **ese mismo borrador privado**, y los fallos en `$EDITORIAL_ESTADO_DIR` | `pendiente_verificacion → terminada`, o `→ fallida_reintentable` |
| **Autorizar** | `autorizar <id>` | Un borrador en `terminada` | **Un archivo en `content/noticias/`**, y nada más | `terminada → autorizada` |

**Los tres son invocaciones separadas, no tres banderas del mismo comando.** Un
`--autorizar` dentro de la corrida vuelve a juntar lo que esta sección separa: bastaría un
valor por defecto mal puesto para publicar sin decisión. Los nombres concretos de los
ejecutables los fija T-E1; lo normativo es que sean tres.

Las tres reglas que la tabla existe para imponer:

1. **Generar escribe SOLO en el directorio privado.** Ni un byte dentro de ningún
   repositorio. Si la ruta de salida no está fuera, el comando aborta (§8.3) en vez de
   escribir en otro sitio.
2. **Verificar NO autoriza.** `terminada` significa exactamente «borrador verificado», y
   nunca «publicable». Verificar no mueve nada al árbol público y no toca
   `procedencia.publicado`. Un sello de verificación es una medición; una autorización es
   una decisión, y quien la toma es Rodrigo.
3. **Autorizar NO redacta ni reverifica.** No corrige el texto, no vuelve a consultar
   fuentes, no arregla una pieza que no pasó. Si el borrador no está en `terminada`, el
   comando se niega: lo que hay que hacer es volver a generar o volver a verificar, y eso
   tiene su propio comando.

> **Por qué `terminada` cambia de significado, y hay que decirlo.** Hoy `estado.mjs`
> documenta `terminada` como «la pieza pasó §5.4 y **entró al corpus**». Con este modelo,
> entrar al corpus público es la autorización, no la verificación. `terminada` pasa a ser
> «hay borrador verificado, sin publicar». Es la spec la que manda sobre el código
> (`CLAUDE.md`), así que la divergencia se cierra en el código.

### 8.2 El cuarto estado: `autorizada`

La máquina de `scripts/editorial/estado.mjs` ya distingue `detectada`,
`pendiente_redaccion`, `pendiente_verificacion`, `fallida_reintentable`, `descartada` y
`terminada`. Le falta el estado que representa la única decisión humana del canal.

**T-E1 añade** a la tabla de transiciones exactamente esto, y nada más. No está añadido:
`estado.mjs:98` sigue listando seis estados y `estado.mjs:135` sigue declarando `terminada`
como terminal (§8.6).

| Desde | Evento | Hacia | Cuándo |
|---|---|---|---|
| `terminada` | `autorizada` | `autorizada` | Un humano autorizó la publicación. **Único evento que escribe en `content/noticias/`** |
| `autorizada` | (ninguno) | `autorizada` | **TERMINAL.** Una corrección posterior va en `correcciones[]` (§3), no en un estado nuevo |

Condiciones duras del evento `autorizada`:

- **`terminada` deja de ser terminal, y gana exactamente una salida: `autorizada`.** Ningún
  otro evento se vuelve legal desde ahí. Todo par (estado, evento) fuera de la tabla sigue
  siendo ilegal y hace lanzar a `aplicar()`.
- **El evento lleva el nombre del humano que autoriza**, y sin él no se emite. Es el mismo
  dato que llena `procedencia.publicado`. Un `autorizado_por: "agente"` no existe: si el
  canal pudiera emitirlo solo, esto sería autopublicación con otro nombre (§1).
- **El campo `estado` del registro editorial tiene vocabulario cerrado de dos valores:**
  `borrador` y `autorizada`. `autorizada` es el valor publicable que `01` §1.1 consume como
  su **único** criterio para listar y para decidir el 404.

  Y hay que no confundir dos cosas que se llaman igual: el **`estado` del registro** (§3)
  dice si la pieza está publicada —`borrador` o `autorizada`, y nada más—; el **estado de la
  entrada** en la máquina dice en qué punto del canal va —`detectada`,
  `pendiente_redaccion`, `pendiente_verificacion`, `fallida_reintentable`, `descartada`,
  `terminada`, `autorizada`—. Solo coinciden en `autorizada`, y coinciden porque describen
  el mismo hecho: un humano decidió.
- Autorizar es **idempotente**: sobre una pieza ya `autorizada` no emite evento ni reescribe
  el archivo.

### 8.3 Dónde vive cada cosa

| Qué | Dónde | Dentro del repo | Quién escribe |
|---|---|---|---|
| Bitácora, fallos y el `vistos.jsonl` heredado | `$EDITORIAL_ESTADO_DIR` | **No** | `generar` y `verificar` |
| Borradores y redacciones | `$EDITORIAL_REDACCIONES_DIR` | **No** | `generar`; `verificar` solo sella |
| **Corpus publicado** | **`content/noticias/`** | **Sí** | **Únicamente `autorizar`** |
| Fixture del prototipo (`prototipo/datos/piezas.json`) | `docs/plataforma/prototipo/` | Sí | **Política: nadie del canal.** Es referencia no normativa (§3). **Hoy sí lo escriben dos caminos del canal** —`ejecutar.mjs:276` y `reverificar-corpus.mjs:58`—, y retirarlos es T-E1 (§8.6) |

> **Lo que sigue en esta sección —la tabla de arriba incluida— es la política, no una
> descripción del canal de hoy.** Medido el 2026-09-17, el código **no la cumple**: las dos
> variables resuelven con `||` a rutas dentro del repositorio, hay tres rutas más que
> escriben dentro sin consultar variable alguna, y `content/noticias/` no existe. El
> inventario completo y quién lo cierra están en §8.6. Cada prohibición lleva abajo su
> propia medición, incluidas las dos que hoy no se rompen.

**`EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` son OBLIGATORIAS y NO tienen valor
por defecto.** Si falta cualquiera de las dos, el canal **aborta** al arrancar —antes de
leer un feed, antes de abrir un archivo—, sale con código distinto de 0 y **no escribe
nada**. No hay modo degradado. Hoy no aborta: corre con el `||` y escribe dentro del
repositorio.

**Son dos, y solo dos.** No hay una tercera variable para un corpus intermedio. La actual
`EDITORIAL_PIEZAS` —que hoy apunta al fixture del prototipo (`ejecutar.mjs:66`)— **no se
renombra ni se sustituye: desaparece**, junto con la función `rutaPiezas()` que la resuelve.
El corpus intermedio deja de existir porque ya no hace falta: `generar` escribe el borrador
en `$EDITORIAL_REDACCIONES_DIR` (§8.1) y lo único que llega al árbol público lo escribe
`autorizar` en `content/noticias/`. Quien lea que `EDITORIAL_REDACCIONES_DIR` «sustituye» a
`EDITORIAL_PIEZAS` está leyendo una versión anterior de este modelo: no la sustituye, porque
no cumplen la misma función.

Está prohibido, y cada prohibición nombra la forma concreta de romper la regla:

- **Un valor por defecto dentro del repositorio.** Es exactamente como esta regla se rompe
  sin que nadie lo note: el canal corre, no falla, y el estado aparece en un `git status`
  que alguien commitea sin leer. Hoy `estado.mjs` resuelve
  `process.env.EDITORIAL_ESTADO_DIR || DIR_ESTADO`, y ese `||` es el defecto.
- **Caer a `process.cwd()`, a un `tmpdir` silencioso o a cualquier ruta inventada.** Perder
  el estado en silencio no es mejor que publicarlo en silencio: rompe la deduplicación de
  §5.2 sin decirlo. **Esta hoy no se rompe**, y conviene decirlo para no confundir el
  diagnóstico: los dos `||` caen a una constante del repositorio, no a `cwd` ni a `tmpdir`.
  Se prohíbe de todos modos porque es el atajo evidente al quitar el fallback.
- **Aceptar una ruta que resuelva dentro de un árbol de trabajo de git**, sea este
  repositorio u otro. Un directorio privado dentro de un repo privado tampoco vale: la regla
  es que el estado no está versionado, no que el repositorio sea discreto.
  **Hoy no existe esa comprobación:** ninguna función del canal mira la ruta resuelta, así
  que T-E1 tiene que añadirla, no conservarla.
- **Que las pruebas usen la ruta real.** Cada prueba monta su propio directorio en `tmpdir`
  y lo pasa por estas mismas variables, igual que `PROOF_FEED_DIR` en el sitio.
  **Hoy se cumple a medias, y la mitad que falta es la que importa:**
  `scripts/editorial/pruebas/ayuda.mjs:25-30` monta `EDITORIAL_ESTADO_DIR` y
  `EDITORIAL_PIEZAS` en `tmpdir`, pero las redacciones no tienen variable que apuntar y
  `errores.jsonl` se resuelve por constante (`comun.mjs:62`), así que ninguna de esas dos
  rutas se puede desviar desde una prueba. No es un descuido del que escribió las pruebas:
  es que la variable no existe (§8.6). Cuando T-E1 retire `EDITORIAL_PIEZAS`, las pruebas
  montan en `tmpdir` las **dos** variables obligatorias y ninguna más.

Los valores concretos viven en el entorno de ejecución —en local, el `.env` de Rodrigo—.
**Esta spec no declara rutas**, porque una ruta escrita aquí es una ruta publicada.

> **La frontera es la AUTORIZACIÓN, no la ubicación.** Una pieza autorizada es **contenido
> publicado**: vive dentro del repositorio público con todo derecho, igual que
> `content/posts/`. Lo que la hace segura ahí no es el directorio, es que un humano decidió
> publicarla. Y al revés: nada es seguro por estar fuera del repositorio —fuera solo
> significa «todavía no es una decisión», y lo de fuera tampoco está respaldado (§8.5).
> De ahí las dos consecuencias, que **hoy no las verifica ninguna compuerta** —el gate que
> tiene que verificarlas lo entrega T-E1 (§8.6)—:
>
> - **Nada llega a `content/noticias/` sin pasar por `autorizar`.** Ni un archivo de
>   ejemplo, ni una prueba, ni «solo para ver cómo se renderiza».
> - **Ninguna otra etapa escribe dentro del repositorio.** Si una etapa necesita dejar algo
>   en disco, lo deja en su directorio privado.

### 8.4 Qué hace exactamente `autorizar`

**Este comando no existe todavía.** Medido el 2026-09-17: no hay ningún ejecutable de
autorización en `scripts/editorial/`, y `content/noticias/` tampoco existe (`git ls-files
content` devuelve solo `content/posts/`). Lo que sigue es el contrato que T-E1 tiene que
construir, en presente normativo porque describe el comando terminado —no el árbol de hoy—.

1. Exige un borrador en `terminada`. Cualquier otro estado: se niega, con el estado actual
   en el mensaje.
2. Exige el humano que autoriza. Sin él, se niega.
3. Comprueba el registro contra §2 y §3 —las cinco preguntas, mínimo dos fuentes,
   `no_establece` no vacío, `tipo` presente— y **vuelve a comprobar los términos de §6**: una
   fuente de solo-detectar no se reproduce. Falla cualquiera: no publica.
4. Escribe **un** archivo en `content/noticias/`, con `estado: "autorizada"` y
   `procedencia.publicado` lleno con el humano y la fecha. La forma queda fijada aquí y no
   se deja a elección del implementador: **un archivo JSON por pieza, `content/noticias/<id>.json`,
   con exactamente el esquema de §3** —el mismo objeto, sin envoltorio y sin campos añadidos—.
   No es markdown con *frontmatter*, aunque `content/posts/` lo sea: el registro editorial es
   estructurado y anidado (`procedencia`, `fuentes[]`, `no_establece[]`, `correcciones[]`), y
   aplanarlo a *frontmatter* pierde el contrato que §3 impone. Un lector como el de
   `lib/posts.ts` no sirve para este corpus; `01` §1.1 lo consume filtrando por `estado` **en
   la lectura**, no en el render.
5. Emite el evento `autorizada` en la bitácora, que vive fuera del repositorio.
6. No hace nada más. No mergea, no empuja, no despliega: el archivo queda en el árbol de
   trabajo y el commit lo decide un humano, como cualquier otro cambio del repositorio.

### 8.5 Persistencia local no es respaldo

Las dos palabras se usan aquí con significados distintos, y no son intercambiables:

- **PERSISTENCIA LOCAL** — el estado sobrevive **entre corridas** en la misma máquina. Eso
  es lo único que da un directorio fuera de git. Es lo que necesita la idempotencia de §5.2
  y la recuperación de pendientes: sin ella, cada corrida vuelve a procesar como nuevo todo
  lo ya visto.
- **RESPALDO** — existe una copia **fuera de esa máquina**, y la restauración se probó al
  menos una vez. Lo que cuenta es la restauración probada, no la existencia de la copia.

**Un directorio local fuera de git da persistencia local y NO es un respaldo: no sobrevive a
la máquina.** Sacar el estado del repositorio resuelve la exposición, no la durabilidad; son
dos problemas y arreglar el primero no toca el segundo.

Lo que se pierde si se pierde la máquina, dicho con precisión para que la decisión se tome
con el costo delante:

| Se pierde | Consecuencia |
|---|---|
| La bitácora | El nivel 3 de deduplicación (§5.2) desaparece: todo hecho ya visto vuelve a entrar como nuevo |
| Los borradores no autorizados | Se pierde el trabajo que aún no era una decisión. Hay que volver a generarlos y a verificarlos |
| El corpus publicado | **No se pierde**: está en git. Reconciliar la bitácora contra `content/noticias/` recierra lo ya publicado sin reprocesarlo —y con el estado nuevo, el cierre correcto de una pieza que está ahí es `autorizada`, no `terminada`—, así que el daño queda acotado a lo no publicado |

**La migración a un almacén con respaldo es lo que hará falta cuando se active la ejecución
programada**, y por una razón mecánica: un runner de CI es efímero, así que no tiene
persistencia local **ni** respaldo. En cuanto el canal corra sin una máquina que sea suya, el
estado necesita vivir en un almacén externo con copia y restauración probada.

**Hoy la ejecución programada NO está activada.** Medido el 2026-09-17: el workflow vive en
`docs/plataforma/programacion/canal-editorial.yml` y **no** en `.github/workflows/`, así que
para GitHub no existe; no hay bloque `schedule` activo y no hay corridas. Elegir el almacén
es parte de activarla, y no se decide aquí.

### 8.6 Estado medido y qué falta

Medido el 2026-09-17 sobre este árbol. Esta spec es normativa; el código todavía no la
cumple, y decirlo es parte de la spec:

| Hecho medido | Evidencia |
|---|---|
| El estado y una redacción están **versionados en este repositorio público** | `git ls-files scripts/editorial` devuelve `estado/bitacora.jsonl`, `estado/errores.jsonl`, `estado/fallos.jsonl`, `estado/vistos.jsonl` y `redacciones/marco-ailit-alfabetizacion-ia-educacion.json` |
| Hay **un** comando, no tres | `scripts/editorial/ejecutar.mjs` encadena detectar → redactar → verificar → escribir corpus |
| No existe el estado `autorizada` | `estado.mjs:98` lista seis estados y `terminada` es terminal |
| No existe `content/noticias/` | `git ls-files content` devuelve solo `content/posts/` |

**Los caminos de escritura dentro del repositorio son cinco, no dos**, y no todos son del
mismo tipo. La distinción importa porque cambia el arreglo: un **default con respaldo**
obedece a la variable cuando está puesta y solo cae dentro del repo si falta; una
**constante sin variable** escribe dentro del repo *siempre*, aunque la variable esté
puesta y sea correcta. Quitar los `||` no toca las tres últimas filas:

| Camino de escritura | Tipo | Evidencia | Qué tiene que hacer T-E1 |
|---|---|---|---|
| Bitácora y estado de la máquina | Default con respaldo | `estado.mjs:153` — `process.env.EDITORIAL_ESTADO_DIR \|\| DIR_ESTADO` | Quitar el `\|\| DIR_ESTADO` y abortar si falta la variable |
| Corpus del prototipo | Default con respaldo | `ejecutar.mjs:66` — `process.env.EDITORIAL_PIEZAS \|\| RUTA_PIEZAS`, escrito en `ejecutar.mjs:276` al final de la misma corrida que redacta y verifica | **Eliminar `rutaPiezas()` y su variable `EDITORIAL_PIEZAS`**, no hacerla obligatoria: el corpus intermedio deja de existir porque `generar` escribe el borrador en `$EDITORIAL_REDACCIONES_DIR` y solo `autorizar` escribe corpus, en `content/noticias/` (§8.3) |
| `errores.jsonl` | **Constante sin variable** | `comun.mjs:62` (`registrarError`) anexa a `RUTA_ERRORES`, derivada de `DIR_ESTADO` en `comun.mjs:15,18`. No consulta `EDITORIAL_ESTADO_DIR`: no es un respaldo, es la única ruta | Redirigir `RUTA_ERRORES` al directorio de estado resuelto. Un fallo del canal no puede ser lo que publique el estado |
| Redacciones | **Constante sin variable** | `DIR_REDACCIONES` en `comun.mjs:16`, leída en `redactar.mjs:92-95`. `EDITORIAL_REDACCIONES_DIR` **no aparece en ningún `.mjs` del repositorio**: `grep -rn "EDITORIAL_REDACCIONES_DIR" scripts/` devuelve cero | **Crear la variable**, que hoy solo existe en esta spec, y resolver `DIR_REDACCIONES` desde ella |
| Reverificación del corpus | **Constante sin variable** | `reverificar-corpus.mjs:24` lee y `:58` escribe `RUTA_PIEZAS` importada de `comun.mjs:19`, sin pasar por `EDITORIAL_PIEZAS` | Resolver desde `$EDITORIAL_REDACCIONES_DIR` —reverificar es sellar un borrador, y los borradores viven ahí—, **o retirar el comando del canal** si su corpus ya no existe. Lo que no puede hacer es seguir resolviendo por `rutaPiezas()`: esa función se elimina en la fila 2 |

Cerrar esa distancia —mover los archivos, **hacer obligatoria la variable de estado,
eliminar `EDITORIAL_PIEZAS` con su función, crear `EDITORIAL_REDACCIONES_DIR` y redirigir las
tres rutas constantes**, partir el comando, añadir el estado y ajustar `.gitignore`— es
**T-E1**, y no ocurre en este documento. Mientras T-E1 no cierre, el canal
no debe correr fuera de la máquina de Rodrigo.

**T-E1 no está cerrado mientras no exista la compuerta que lo sostenga.** Las cuatro
prohibiciones de §8.3 son verificables por máquina y hoy **ningún gate las mira**:
`typecheck`, `lint`, `test`, `build`, `guard:exposicion` y `guard:funnel` pasan los seis con
el estado versionado en el árbol. `auditoria-exposicion.mjs` tampoco sirve para esto: corre
*después* de escribir. Sin compuerta, T-E1 puede cumplir las cuatro y un `git add` distraído
las revierte la semana siguiente en silencio —que es exactamente como el árbol llegó al
estado de esta tabla—. T-E1 entrega, además del cambio, un gate de CI que **falla** si:

1. `git ls-files scripts/editorial/estado scripts/editorial/redacciones` devuelve **una sola
   línea**. Las rutas van **literales**, no `$EDITORIAL_ESTADO_DIR`: la comprobación vigila
   las **rutas históricas dentro del repositorio**, que es donde el estado está hoy y donde
   un `git add` distraído lo devolvería. Sobre las rutas nuevas no serviría de nada —viven
   fuera de todo árbol de git, así que `git ls-files` no devolvería nada nunca y el gate no
   podría fallar—. Escrito así **falla hoy**, que es la prueba de que puede fallar; si T-E1
   añade otras rutas históricas, se añaden a la lista;
2. el canal **no** aborta con código distinto de 0 cuando falta `EDITORIAL_ESTADO_DIR` o
   `EDITORIAL_REDACCIONES_DIR`;
3. la ruta resuelta de cualquiera de las dos cae dentro de un árbol de trabajo de git;
4. una prueba resuelve la ruta real en vez de montar la suya en `tmpdir` —se comprueba
   corriendo la suite con las dos variables apuntando a un `tmpdir` y verificando que
   `git status --porcelain -- scripts/editorial/estado scripts/editorial/redacciones
   docs/plataforma/prototipo/datos` queda vacío al terminar—. **Acotado a esas rutas a
   propósito:** un `git status --porcelain` sin acotar falla ante cualquier archivo sucio del
   árbol, tenga o no que ver con el canal, y un gate que se pone rojo por suciedad ajena se
   acaba ignorando.

Las cuatro comprobaciones son de máquina. Ninguna depende de que alguien se acuerde.

### 8.7 La frontera con la evidencia, que la autorización no mueve

Autorizar una pieza la vuelve **contenido publicado**; no la vuelve evidencia. La regla de
`docs/03-privacy-and-publication-policy.md` §4, tabla «Fronteras que nunca se cruzan», sigue
intacta y se reitera entera:

> «Contenido editorial (`content/`) → Evidencia: El blog puede *enlazar* a evidencia;
> **jamás derivarse de ella ni alimentarla.**»

Que el corpus autorizado viva en `content/noticias/` —dentro del repositorio, a un
directorio de distancia del feed— no acerca los dos registros ni un milímetro:

- `autorizar` **no lee** `public/proof/**` y **no escribe** en `public/proof/**`. Es zona
  del motor de evidencia (`CLAUDE.md`).
- Una pieza autorizada **no se convierte en `Evidence`**, ni con `provenance: declared`, ni
  se cuenta en ninguna métrica del sujeto (`01` §1.2).
- La única vía por la que los dos registros se tocan sigue siendo la declaración de relación
  de §4.

> **Nota de referencia.** Este documento citaba antes esa frontera como `docs/03:136`. En el
> árbol actual la regla está en `docs/03:194`: **la regla no cambió, la línea derivó** al
> crecer `docs/03`. Las citas de §0 y de esta sección quedan corregidas **por sección**, que
> no se desplaza, y lo mismo en `decisions/0015`. El hallazgo está registrado en
> `docs/plataforma/01-noticias-y-actividad.md` §1.2.
