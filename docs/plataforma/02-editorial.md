# 02 — Canal editorial: noticias y análisis de IA, software y educación en México

> **Estado: BORRADOR — en revisión.** No es autoridad sobre nada mientras
> `docs/decisions/0015-actividad-proceso-y-editorial.md` siga en PROPUESTA. Nada de lo
> descrito aquí está publicado, y ninguna pieza producida bajo esta spec sale del estado
> de borrador sin decisión de Rodrigo.

---

## 0. Qué es y para quién

Un canal de **noticias y análisis de IA, software y educación con foco en México**, para
quien **dirige tecnología, construye productos o forma talento**. No es un blog de
opinión ni un agregador.

**Vive dentro del sitio** para esta entrega. No se decide marca ni dominio propios ahora:
demostrar el producto no requiere esa decisión, y tomarla sin necesidad sería
comprometer algo reversible por adelantado.

### La frontera que no se cruza

`docs/03-privacy-and-publication-policy.md:136` es explícito y no se toca:

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

`docs/plataforma/prototipo/datos/piezas.json`. Todo borrador vive aquí; **ninguno se
publica** en esta entrega.

```jsonc
{
  "id": "kebab-case-estable",
  "tipo": "noticia" | "analisis" | "opinion",   // renderizado SIEMPRE, visible
  "titulo": "string",
  "entradilla": "string",                        // una frase, con el dato duro
  "estado": "borrador",                          // unico valor permitido hoy
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
- **`procedencia.publicado` es `pendiente` en todo el corpus de esta entrega.** No hay
  autopublicación, ni la habrá sin decisión de Rodrigo.
- **Nunca se guarda el prompt, la transcripción ni el contenido generado intermedio.** Se
  guarda el vínculo: qué modelo redactó, no qué se le dijo (`AGENTS.md:60`, `02:494`).

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
