# 00 — Resumen de entrega

> **Estado: BORRADOR — para revisión.** Nada está publicado ni desplegado. No se mergeó
> ningún PR, no se tocó ningún perfil social, no se envió ningún mensaje y no se contrató
> ningún servicio.
>
> **[AVISO VENCIDO — 2026-09-28.] La primera mitad de este párrafo ya es falsa y se deja
> tachada en vez de borrarla.** Era cierta el 2026-09-15. Desde entonces se mergearon los
> PRs **#32 a #51**, y el despliegue de producción vigente —medido contra el registro de
> despliegues, no deducido de la rama— es `916bedb`, el merge del PR #43, con estado
> `success`. Lo que sigue siendo cierto: no se tocó ningún perfil social, no se envió ningún
> mensaje y no se contrató ningún servicio. Medición completa abajo, en *Estado de
> implementación*.

Fecha: 2026-09-13 · actualizado el 2026-09-15 · WakaTime resondeado el 2026-09-14 · Rama: `feat/plataforma-editorial-y-actividad`

> **Actualización del 2026-09-28 — estado de implementación.** Lo de arriba y todo lo que
> sigue a «Qué funciona de verdad» describe la tanda del **prototipo**, cerrada el
> 2026-09-15. Entre el 2026-09-17 y el 2026-09-26 se construyó el sitio real. Lo medido de
> esa segunda tanda está en la sección inmediatamente siguiente, que es la que hay que leer
> primero. Rama `docs/estado-de-implementacion`, HEAD `9a9f883`.

> **Este repositorio es PÚBLICO.** Estos documentos **no** nombran repositorios no públicos,
> ni publican conteos atribuidos a una organización, ni series mensuales de actividad
> privada, ni el reparto público/privado, ni la composición de autoría de ningún repositorio
> no público, ni el número total de repositorios. Lo medido y retirado se describe —sin
> reproducirlo— en `03-catalogo-de-metricas.md` §Decisiones pendientes. La compuerta que lo
> verifica es `node scripts/auditoria-exposicion.mjs`.

---

# Estado de implementación — medido el 2026-09-28

Esta sección es nueva y sustituye, como estado vigente, a todo lo que viene después de
ella. Lo de después no se borra: describe la tanda del prototipo y su registro sigue
valiendo como historia.

## Cómo leer las etiquetas

Las tres que fija `AGENTS.md` → *Principio de verificación* (punto 2):

| Etiqueta | Qué significa exactamente |
|---|---|
| **HECHO** | Hay un comando y su salida pegada en este documento. Nada más cuenta como HECHO. |
| **INFERENCIA** | Lectura del código, del `git log` o de un artefacto, **sin ejecutar** lo que se afirma. Puede ser correcta y aun así no es un hecho. |
| **DEUDA** | Sé que falta, no lo arreglo aquí, y digo qué haría falta para cerrarlo. |

Una afirmación sin salida de comando no se escribe como completitud. Donde no pude medir,
está dicho con esas palabras.

## HECHO — los gates, con su comando y su salida

Corridos el **2026-09-28**, sobre `9a9f883e215e23c24a94649de87015ba90d3223f`, en la rama
`docs/estado-de-implementacion`, en Windows con Node local.

> **Cómo se pegaron las salidas.** Son literales. Donde se recortaron líneas intermedias hay
> `[...]` en su lugar, y las líneas que no cabían a lo ancho se envolvieron sin cambiar una
> palabra. Ningún número de estas salidas se transcribió a mano.

```
$ npm run typecheck

> rodrigobermejo-site@0.1.0 typecheck
> tsc --noEmit
```

`tsc --noEmit` imprime sus diagnósticos en stdout y npm imprime un bloque `npm error` al
salir distinto de cero. No apareció ninguna de las dos cosas: **cero diagnósticos**.

```
$ npm run lint

> rodrigobermejo-site@0.1.0 lint
> eslint --max-warnings 0

[exited with code 0]
```

```
$ npm test
[...]
ℹ tests 409
ℹ suites 0
ℹ pass 409
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14565.4669

[exited with code 0]
```

```
$ npm run build
  Creating an optimized production build ...
✓ Compiled successfully in 8.5s
  Running TypeScript ...
  Collecting page data using 7 workers ...
⚠ Using edge runtime on a page currently disables static generation for that page
[...]
✓ Generating static pages using 7 workers (29/29) in 1265.4ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /actividad
├ ƒ /api/subscribe
├ ○ /blog
├ ● /blog/[slug]
│ ├ /blog/cuando-excel-deja-de-funcionar
│ ├ /blog/mitos-sobre-automatizacion
│ └ /blog/seguimiento-donde-mueren-las-ventas
├ ○ /colaborar
├ ○ /evidencia
├ ○ /noticias
├ ● /noticias/[slug]
├ ƒ /opengraph-image
├ ○ /proyectos
├ ● /proyectos/[slug]
│ ├ /proyectos/contenido-ia
│ ├ /proyectos/curricula-inadaptados
│ ├ /proyectos/docencia-universitaria
│ └ [+9 more paths]
├ ○ /robots.txt
├ ○ /sitemap.xml
└ ○ /sobre-mi

[exited with code 0]
```

Los cuatro guards:

```
$ npm run guard:funnel
OK: funnel desacoplado. 11 entradas, 41 modulos en el cierre transitivo.

$ npm run guard:canal
OK: canal determinista (2a corrida = 0 nuevos), lo interrumpido se recupera sin duplicar,
y tres fallos descartan con motivo. Los dos comandos, sin red y sin inferencia.

$ npm run guard:estado-editorial
OK: git no rastrea nada bajo scripts/editorial/estado ni scripts/editorial/redacciones.
El estado del canal editorial no esta en el repositorio publico.
NO MEDIDA: la ausencia en disco de las rutas historicas no se comprueba todavia. No hay
senal de que la migracion haya corrido ($EDITORIAL_ESTADO_DIR sin bitacora.jsonl, o sin
definir). Desrastrear no es borrar: hasta migrar, esas rutas tienen que seguir en disco.

$ npm run guard:exposicion
OK: sin exposicion detectada.
NOTA: sin --lista, no se comprobaron nombres de repositorios privados.
```

**Dos de los cuatro guards declaran su propio hueco en la salida**, y esos huecos no son
verdes: `guard:estado-editorial` dice que **no midió** si la migración del estado corrió, y
`guard:exposicion` dice que **no comprobó nombres de repositorios privados**. Están
recogidos abajo como pendientes con acción concreta.

**Lo que esa salida `NO MEDIDA` sí dice, y lo que no.** `scripts/check-estado-editorial.mjs:110-126`
la emite cuando `EDITORIAL_ESTADO_DIR` está **sin definir** *o* apunta a un directorio sin
`bitacora.jsonl`, y sale con código 0 sin mirar nada más. En esta corrida la variable no
estaba definida. Por lo tanto: **la migración no quedó verificada en esta ejecución.** No se
sigue de ahí que no haya corrido — una migración completada en otra sesión, en otra máquina
o con la variable definida en otro shell produce exactamente esta misma salida. Ausencia de
señal no es señal de ausencia; medir contra la bitácora del guard no es medir contra el
sistema.

Tampoco lo resuelve mirar el disco desde aquí:

```
$ ls -d scripts/editorial/estado scripts/editorial/redacciones
ls: cannot access 'scripts/editorial/estado': No such file or directory
ls: cannot access 'scripts/editorial/redacciones': No such file or directory
```

**INFERENCIA, y de las débiles:** este documento se escribió en un *worktree* de git, y las
dos rutas están ignoradas (`.gitignore:60-61`), así que un worktree recién creado **nunca
las tuvo** — no las clona ningún checkout. Su
ausencia aquí no distingue «migradas» de «nunca existieron en esta copia». Comprobarlo exige
mirar el árbol principal y el destino real, y eso es el pendiente 4.

**Un verde aquí significa «no rompí lo que ese gate mira».** El alcance exacto de cada
guard —lo que garantiza y lo que se le escapa— está tabulado en `04-architecture.md` §4.1.

## HECHO — qué está desplegado no es lo mismo que qué está construido

Esto son **dos mediciones distintas**, y conviene no colapsarlas: una compara ramas, la otra
identifica el despliegue. La primera sola no dice qué sirve producción — un despliegue
fallido, detenido o revertido deja las ramas exactamente igual.

### HECHO (1/2) — la distancia entre ramas

`develop` va **ocho commits por delante de `main`**, en el repositorio local y en el remoto:

```
$ git rev-list --count main..develop
8

$ git rev-list --count origin/main..origin/develop
8

$ git for-each-ref --format='%(refname:short) %(objectname:short)' \
    refs/heads/main refs/heads/develop refs/remotes/origin/main refs/remotes/origin/develop
develop 9a9f883
main 916bedb
origin/develop 9a9f883
origin/main 916bedb

$ git log --oneline main..develop
9a9f883 S-E: cerrar las divergencias documentales cruzadas (#51)
dc04edc T-E4: Partir ejecutar en generar y verificar — tres etapas, tres invocaciones (#50)
787f9ae T-E3: Programacion preparada y DESACTIVADA (#49)
2d20654 feat(T-S6): la pasada de navegador, con su evidencia atada al SHA (#48)
21194ef fix(navegador): tres defectos que solo aparecen operando el sitio, no leyendolo (#47)
66f5bc5 feat(t-s4): /actividad: WakaTime con cobertura, sin ratios ni rachas (#46)
a8678fb T-S5: /noticias y /noticias/[slug] leyendo el corpus real (#45)
f1b6cf3 T-E2: Autorizacion editorial y corpus publicado (#44)

$ git log --oneline develop..main
916bedb Merge pull request #43 from RBloomDev/develop
605bff7 Merge pull request #31 from RBloomDev/develop
db992b2 Merge pull request #28 from RBloomDev/develop
caa39c0 Merge pull request #19 from RBloomDev/develop
534ed49 Merge pull request #17 from RBloomDev/develop
f64739a Merge pull request #6 from RBloomDev/develop
```

Los seis del segundo listado son los merges `develop → main`, no trabajo propio de `main`.

Hasta aquí, todo lo medido es **estado del repositorio**. Nada de esto identifica qué SHA
sirve el sitio que abre un tercero.

### HECHO (2/2) — qué SHA sirve producción

El sitio se despliega por integración de git con Vercel, sin `vercel.json` y sin paso de
deploy en `.github/workflows/` (`04-architecture.md:180`; `ls -d .vercel` responde *No such
file or directory*). Pero el proveedor registra cada despliegue como un *deployment* de
GitHub —es de lo que vive `.github/workflows/canonical-urls.yml:24-30`, que dispara con
`deployment_status` y `environment == 'Production'`—, y eso **sí** se puede medir desde
aquí:

```
$ gh api "repos/RBloomDev/rodrigobermejo-site/deployments?environment=Production&per_page=2" \
    --jq '.[] | "\(.id) \(.sha[0:7]) \(.created_at)"'
6649364084 916bedb 2026-09-24T22:21:11Z
6474330598 605bff7 2026-09-16T05:20:28Z

$ gh api "repos/RBloomDev/rodrigobermejo-site/deployments/6649364084/statuses?per_page=1" \
    --jq '.[] | "\(.state) \(.created_at)"'
success 2026-09-24T22:21:11Z
```

**El despliegue de producción más reciente es `916bedb`, y su último estado es `success`.**
Coincide con `main`, pero la coincidencia está *medida*, no deducida — y ésa es toda la
diferencia. Un despliegue fallido, detenido o revertido habría dejado las salidas de
`HECHO (1/2)` **exactamente iguales**: `main` seguiría en `916bedb` y `develop` ocho
commits por delante. Lo único que cambia en ese escenario es el `state` de aquí abajo. Leer
el estado del despliegue en la rama es el error que esta sección existe para no cometer.

**Límite declarado de esta medición.** Mide el registro de despliegue de GitHub, no el HTML
que sirve el dominio. Un rollback hecho desde el panel de Vercel sin volver a notificar a
GitHub no aparecería aquí. Verificar ese último eslabón exige la CLI de Vercel o abrir el
sitio en un navegador, y **ninguna de las dos se hizo en esta ejecución**. Queda dicho, no
afirmado, y está abajo como pendiente 12.

**Todo lo que este documento mide está en `develop`.** Ocho entregas —`/noticias`,
`/actividad`, los tres fixes de navegador, la pasada de verificación, la programación
preparada y el canal en tres etapas— **no están desplegadas**: el despliegue vigente es
`916bedb` y ninguna de ellas es ancestro suyo. Ningún agente mergea a `main`: esa decisión
es de Rodrigo (`decisions/0010`, `AGENTS.md`). Está abajo, con acción concreta.

## HECHO — qué quedó implementado, y dónde vive

La implementación vive en **`app/` y `components/`**, y la salida de `npm run build` de
arriba es la lista completa de lo que el sitio renderiza. Diez rutas navegables más
`robots.txt`, `sitemap.xml`, la ruta de API y la imagen de OpenGraph.

En la tabla siguiente, la columna **Ruta** es **HECHO** —sale de `npm run build`— y las
cifras de la columna **Qué lee** también, de los `ls` y los conteos de más abajo. Las otras
dos columnas son **INFERENCIA**: la atribución de tarea la leí de los asuntos de commit del
`git log`, y qué fuente lee cada ruta lo leí de los imports, sin instrumentar nada.

| Ruta | Tarea que la construyó | Qué lee |
|---|---|---|
| `/` | T-S2 (#39) | Nada del feed. El funnel comercial está desacoplado y `guard:funnel` lo comprueba. |
| `/sobre-mi`, `/colaborar` | T-S2 (#39) | Contenido estático del copy deck. |
| Navbar, Footer, menú móvil | T-S1 (#38) | `lib/navegacion.ts`. |
| `/proyectos`, `/proyectos/[slug]` | T-S3 (#40) | `public/proof/v1/projects.json` — **12 proyectos**, y las 12 rutas se prerenderizan. |
| `/evidencia` | Sprint D | `public/proof/v1/claims.json` — **3 claims**. |
| `/actividad` | T-S4 (#46) | `proceso.json` y `activity.json` del feed. |
| `/noticias`, `/noticias/[slug]` | T-S5 (#45) | `content/noticias/`. |
| `/blog`, `/blog/[slug]` | preexistente, corregido en #42 | `content/posts/` — 3 piezas. |
| `/api/subscribe` | preexistente | Maneja PII. La regla —no loguear payloads ahí, nunca— está en `CLAUDE.md`; este documento **no la verificó**. |

Y el canal editorial, que **no es el sitio**: vive en `scripts/editorial/` y hoy son tres
invocaciones separadas —`generar.mjs`, `verificar-canal.mjs`, `autorizar.mjs`— desde T-E4
(#50).

### HECHO — dos rutas renderizan su estado de ausencia, no su contenido

Esto es lo más fácil de leer al revés, así que va medido:

```
$ ls public/proof/v1
claims.json  evidence.json  meta.json  projects.json

$ ls public/proof/schemas
activity.schema.json  claims.schema.json  evidence.schema.json
meta.schema.json      proceso.schema.json  projects.schema.json

$ test -d content/noticias && echo "SI existe" || echo "NO existe"
NO existe

$ git ls-files content
content/posts/cuando-excel-deja-de-funcionar.md
content/posts/mitos-sobre-automatizacion.md
content/posts/seguimiento-donde-mueren-las-ventas.md
```

- **`/actividad` no tiene artefacto que leer.** Los schemas `activity` y `proceso` están
  publicados; los artefactos `activity.json` y `proceso.json` **no existen** en
  `public/proof/v1/`. La pantalla existe y compila; lo que muestra hoy es su rama de
  ausencia.
- **`/noticias` no tiene corpus.** `content/noticias/` no existe, y en la salida de
  `npm run build` la entrada `● /noticias/[slug]` **no lista ni una ruta hija**, mientras
  que `/blog/[slug]` lista sus tres y `/proyectos/[slug]` sus doce. El corpus lo llena
  `autorizar.mjs`, que corre Rodrigo a mano. Lo medido es que **su salida no está en el
  árbol**: `content/` no está en `.gitignore` y `git ls-files content` sólo devuelve los
  tres `content/posts/*.md`. Si `autorizar.mjs` corrió alguna vez en una máquina y no se
  commiteó, esto no lo distinguiría; lo que sí afirma es que hoy no hay pieza publicada.
- **`evidence.json` tiene `evidence: []` y `meta.counts.evidence: 0`.** Es el estado
  legítimo del Sprint D, no una falla.

Que estas tres ausencias sean el estado *correcto* según la spec no las vuelve
«implementado y funcionando». Son superficie construida esperando dato.

## HECHO — `docs/plataforma/prototipo/**` es HISTÓRICO

Las cinco pantallas HTML de `docs/plataforma/prototipo/` —`portada.html`, `noticias.html`,
`noticia.html`, `proyectos.html`, `proyecto.html`, más `sistema.css` y `datos/`— **no son
la entrega**. Informaron el diseño y ahí se queda su valor. Lo mismo vale para
`docs/brand/prototipos/`.

La entrega es `app/` y `components/`, y es lo que sale en `npm run build`.

`01-noticias-y-actividad.md` ya lo dice con todas sus letras en dos lugares —«referencia
**no normativa**: enseña una solución, no la define» (§ de alcance) y «**Las cinco
pantallas del prototipo** no se promueven a producción por este documento»—, y
`02-editorial.md:516` fija la política de que **nadie del canal escribe el fixture del
prototipo**. Este documento lo repite porque era el único donde las cinco pantallas
aparecían presentadas como el entregable.

**Consecuencia práctica:** si el prototipo y el sitio divergen, **el prototipo está
desactualizado**, no el sitio. No se corrige el sitio para que se parezca al HTML.

## HECHO INCÓMODO — 41 criterios se marcaron SATISFIED sin comprobarse uno por uno

**41 criterios de tipo «reviewer», repartidos en las 10 tareas cerradas antes del
2026-09-22, se marcaron SATISFIED por el VEREDICTO GLOBAL del Reviewer**, sin que nadie
comprobara cada criterio por separado. El orquestador cerraba los criterios así. **Ya está
corregido**: hoy el Reviewer tiene que nombrar cada criterio con CUMPLE y decir CÓMO, y un
veredicto global no satisface ninguno. Pero **las tareas cerradas antes conservan esa
marca**, y subirlas a «verificado» retroactivamente sería inventar la verificación.

Hay que separar dos cosas que se confunden solas, y no mezclarlas **ni en una dirección ni
en la otra**:

- **Lo que SÍ se puede afirmar de esas 10 tareas.** Hubo revisión independiente, produjo
  hallazgos reales y bloqueó entregas. Está en sus reportes, y su rastro llega hasta este
  repositorio: los cuerpos de commit desde S-A citan por identificador **8 hallazgos**
  distintos del Reviewer —`F-AUT-06`, `F-AUT-07`, `F-AUT-08`, `F-AUT-09`, `RR-CRU-03`,
  `RR-NEW-04`, `RR-NEW-05`, `RR-NEW-06`—, incluido uno que el propio Reviewer marcó como
  **regresión introducida por su propio run** en vez de taparla.
- **Lo que NO se puede afirmar.** Que cada uno de esos 41 criterios se comprobara por
  separado. No se comprobó. Un veredicto global es una firma sobre el conjunto, no 41
  comprobaciones.

Y el defecto no es teórico: **`scripts/verificar-reglas-de-forma.mjs:11` lo deja escrito en
el propio código**, con nombre y número —

> «`AC-PRY-05` quedó **tres veces** marcado SATISFIED sin que nadie abriera un navegador, y
> ese fue el defecto que obligó a arreglar la compuerta de criterios del orquestador.»

**Límite de esta afirmación, declarado:** los registros de run del orquestador —`cola/tareas/*.criteria.json`
y los reportes de Reviewer— **no viven en este repositorio**. `git ls-files | grep -c '^cola/'`
devuelve **0**. El número **41**, el número **10** y la fecha **2026-09-22** vienen de esos
registros y **no los recontó este documento**. Lo que sí se midió aquí es la corroboración
de arriba: los 8 identificadores de hallazgo en el histórico y la línea del script.

## DEUDA — lo que sigue sin verificarse de verdad: lo que exige mirar una pantalla

Ningún run del orquestador puede cubrir esto: sus gates son códigos de salida y su Reviewer
es de sólo lectura. Lo cubre la pasada de navegador de T-S6.

**La pasada de navegador SÍ ocurrió**, el 2026-09-24. Su evidencia está en el repositorio,
atada al SHA que midió:

```
$ cat docs/plataforma/verificacion/2026-09-24/manifiesto.json
{
  "sha": "21194ef7df22897d1a8a92dc36db196c84b9fdb6",
  "base_url": "http://localhost:3401",
  "generado_en": "2026-09-25T03:28:15.764Z",
  "como_se_midio": "El viewport se emula con Emulation.setDeviceMetricsOverride y se
    verifica leyendo window.innerWidth DESPUES de emular y ANTES de capturar. [...] Si el
    ancho medido no coincide con el nominal, la captura NO se guarda y el script sale con
    codigo 1.",
  "rutas_cubiertas": ["/", "/noticias", "/actividad", "/proyectos",
    "/proyectos/contenido-ia", "/sobre-mi", "/colaborar", "/evidencia",
    "/blog", "/blog/mitos-sobre-automatizacion"],
  "capturas": [ [...] 20 entradas [...] ]
}
```

20 capturas —diez rutas × 1280 px y 390 px—, con el viewport **medido** después de emular y
antes de capturar, `desborda_horizontal: false` en las veinte, y `h1` y jerarquía de
encabezados registrados por captura.

**Lo que esa pasada NO cubre, y por tanto sigue sin verificarse:**

| Sin verificar | Por qué no lo cubre el manifiesto |
|---|---|
| **Contraste de color en el sitio real** | El manifiesto registra viewport, desbordamiento, título, `h1` y jerarquía. No mide contraste. La medición de contraste que hay en este documento es del **prototipo HTML**, no de `app/`. |
| **Recorrido de teclado y foco visible en el sitio real** | Igual: el recorrido de 35 paradas que se cita abajo es del prototipo. |
| **Los filtros de `/proyectos` operados de verdad** | El manifiesto captura la pantalla; no hace clic. El «2 de 12 / 4 / limpiar → 12» que se cita abajo es del prototipo. |
| **Las seis reglas de forma de `/proyectos`** | Las comprueba `scripts/verificar-reglas-de-forma.mjs`, que es un **script aparte** y **no deja manifiesto**. No hay evidencia versionada de una corrida suya. |

**Y la pasada está desactualizada respecto de HEAD.** Medido:

```
$ git diff --stat 21194ef..HEAD -- app components lib
 app/actividad/page.tsx |  2 +-
 lib/navegacion.ts      | 11 +++++++++--
 lib/proof/actividad.ts | 11 +++++++----
 3 files changed, 17 insertions(+), 7 deletions(-)
```

El cambio en `app/actividad/page.tsx` **altera el texto que se pinta**: introduce la rama
`periodo_abierto`, que cambia «días del periodo» por «días transcurridos» con su
explicación. Lo trajo S-E (#51), después de la pasada.

**Conclusión, sin suavizar: la evidencia de navegador de `/actividad` no corresponde a lo
que HEAD renderiza.**

Para las otras nueve rutas, **INFERENCIA** —leí el diff, no capturé de nuevo—: los otros
dos archivos no cambian lo que se pinta. `lib/navegacion.ts` cambió **sólo dentro de un
bloque de comentario** `/** ... */`, y `lib/proof/actividad.ts` sólo exporta símbolos y
añade `periodo_abierto` al schema, que únicamente consume `/actividad`. Una inferencia
razonable no es una captura, y por eso el pendiente 9 sigue abierto.

## Correcciones previstas que NO ocurrieron, y una que no se pudo verificar

Se reportan, no se omiten (`AGENTS.md` → *Principio de verificación*, punto 3). Y se
distinguen: **NO CORREGIDA** es una medición que dice que el defecto sigue ahí; **NO
VERIFICADA** es que no hay medición, lo cual no autoriza a afirmar ninguna de las dos
cosas.

### 1. NO CORREGIDA — el conteo de pruebas diverge en tres documentos, y S-E no lo cerró

La tarea S-E (#51) se llamó literalmente «cerrar las divergencias documentales cruzadas».
Ésta quedó abierta. Medido hoy contra los **409** que devuelve `npm test`:

| Dónde | Qué dice | Real |
|---|---|---|
| Este archivo, fila «Las pruebas ya corren en CI» de la tabla HISTÓRICA de más abajo | «Ahora `npm test` son **192**» | 409 |
| `docs/plataforma/programacion/02-el-pr-de-esta-entrega.md:130` | «`npm test` # **371** pruebas» | 409 |
| `CLAUDE.md:24` | «`npm test` # node --test, **273** tests» | 409 |

Los tres números fueron ciertos cuando se escribieron. Ninguno lo es hoy. **No los corrijo
en esta tarea**: `CLAUDE.md` está fuera del alcance «sólo docs», y los otros dos son
registros fechados de una entrega anterior cuyo texto no me toca reescribir. Queda como
pendiente con acción concreta abajo.

### 2. NO VERIFICADA — la migración del estado editorial no quedó comprobada

**Esta entrada estaba mal escrita y se corrige aquí**: decía «no ha corrido», y eso es más
de lo que cualquier medición de esta ejecución sostiene.

Lo que sí sostiene: el guard comprueba que git **no rastrea** el estado; **no** comprueba
que el estado se haya movido fuera del disco del repo, y su `NO MEDIDA` se dispara igual con
`EDITORIAL_ESTADO_DIR` sin definir —que es el caso de esta corrida— que con una migración
pendiente de verdad (`scripts/check-estado-editorial.mjs:110-126`). Desrastrear no es migrar,
y no medir no es haber medido un cero.

Queda entonces como **no verificada**, no como no ocurrida. Lo que falta por comprobar está
en el pendiente 4: el destino real y las rutas históricas en el árbol principal.

### 3. NO CORREGIDA — `/actividad` no tiene su artefacto

Ver arriba. La pantalla se construyó en T-S4; `proceso.json` y `activity.json` no existen.
Eso no es un defecto de T-S4 —el motor los escribe, no el sitio—, pero sí significa que
«`/actividad` funciona» es hoy una afirmación sobre la rama de ausencia.

## Pendientes humanos — con su acción concreta y qué desbloquea

Cada fila tiene un comando o un movimiento concreto. Un pendiente sin acción concreta no es
un pendiente.

**Procedencia de las mediciones que cita esta tabla.** Los pendientes 5, 6, 9, 10, 11 y 12
salen de comandos corridos hoy y pegados arriba. El 8 sale de `npm test` corrido hoy. El
**4 no es una medición sino la ausencia de una**: el guard declara `NO MEDIDA` y por eso el
pendiente existe. Los pendientes **1 y 2** citan mediciones de
`docs/plataforma/programacion/02-el-pr-de-esta-entrega.md`
§«Las dos dependencias que HOY faltan» —el alcance del token y `gh secret list` vacío—, y
**este documento no las volvió a medir**. El 3 y el 7 son decisiones declaradas, no
mediciones.

| # | Pendiente | ACCIÓN CONCRETA | QUÉ DESBLOQUEA |
|---|---|---|---|
| 1 | El token del agente no tiene alcance `workflow` (alcance medido: `gist, read:org, repo`) | Rodrigo amplía el alcance del PAT a `workflow` en la configuración del token, o instala él mismo `docs/plataforma/programacion/canal-editorial.yml` en `.github/workflows/` | Que el canal editorial pueda instalarse. Hoy un commit que toque `.github/workflows/` se rechaza al empujar. Sin esto, los pendientes 2 y 3 no llegan a importar. |
| 2 | No existe credencial de inferencia no interactiva (`gh secret list` vacío en los tres repos del núcleo) | Rodrigo crea la API key del proveedor de inferencia y la guarda como secret del repositorio | Corridas del canal con `con_redactor: true`. Con `false` el canal detecta y deduplica sin modelo, así que esto no bloquea una primera corrida. |
| 3 | No hay almacén externo con respaldo para `EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` | Rodrigo elige el destino (disco del VPS, bucket, o repo privado) y lo declara en `docs/plataforma/programacion/00-donde-correria.md` | Persistencia entre corridas. Un runner es efímero: sin esto cada corrida reprocesa como nuevo todo lo ya visto. Y sin esto la migración del pendiente 4 no tiene a dónde ir. |
| 4 | No está verificado si la migración del estado editorial corrió. El guard emite `NO MEDIDA`, que no distingue «no migrado» de «migrado con la variable sin definir en este shell» | Definir `EDITORIAL_ESTADO_DIR` apuntando al destino del pendiente 3 y correr `npm run guard:estado-editorial` — si el destino ya tiene `bitacora.jsonl`, el guard pasa a comprobar de verdad las rutas históricas y el resultado deja de ser ambiguo. Si no lo tiene, correr el procedimiento de `docs/plataforma/programacion/01-migrar-el-estado-editorial.md` | Convertir un `NO MEDIDA` en una medición. Hoy nadie puede decir en qué estado está la migración sin salir de este repositorio, y las rutas históricas no pueden borrarse del disco mientras eso siga así. |
| 5 | `/noticias` no tiene corpus | Rodrigo revisa un borrador verificado y corre `npm run editorial:autorizar` | Que `/noticias/[slug]` prerenderice piezas reales. Es **decisión de publicación**, por eso no la toma un agente (`AGENTS.md` → *Escalar a un humano*). |
| 6 | `/actividad` no tiene artefacto (`proceso.json`, `activity.json`) | Correr `npm run feed:build` en el motor, revisar `npm run feed:diff`, y commitear los artefactos en `public/proof/v1/` | Que `/actividad` muestre dato en vez de su rama de ausencia. `public/proof/v1/**` es zona prohibida para los agentes de este repo (`decisions/0011`, `decisions/0012`). |
| 7 | El agregado de GitHub no está autorizado para publicarse | Decisión explícita de Rodrigo, escrita en `03-catalogo-de-metricas.md` §Decisiones pendientes | Publicar cualquier serie o total de GitHub que no venga de repositorios públicos. Hoy la política dice que no, y la pantalla explica la regla sin ilustrarla con el dato. |
| 8 | Los tres conteos de pruebas divergentes (192 / 371 / 273 vs 409 reales) | Una tarea de una sola pasada que corra `npm test`, y sustituya el número en `CLAUDE.md:24`, `docs/plataforma/programacion/02-el-pr-de-esta-entrega.md:130` y la fila «Las pruebas ya corren en CI» de la tabla HISTÓRICA de este archivo. Toca `CLAUDE.md`, que está fuera del alcance «sólo docs» | Que un lector pueda confiar en el número que lee sin recontarlo. Hoy los tres están mal y no hay gate que lo vea. |
| 9 | La pasada de navegador está atada a `21194ef`; `/actividad` cambió después | Correr `node scripts/capturar-verificacion.mjs http://localhost:3401 docs/plataforma/verificacion/<fecha> $(git rev-parse HEAD)` con el sitio servido, y commitear el manifiesto nuevo | Que la evidencia visual corresponda a HEAD. Y correr `scripts/verificar-reglas-de-forma.mjs` con salida guardada cubriría además las seis reglas de forma, que hoy no tienen evidencia versionada. |
| 10 | `guard:exposicion` no comprueba nombres de repositorios privados sin `--lista` | Rodrigo provee la lista de nombres privados por un canal que no la versione, y se corre `node scripts/auditoria-exposicion.mjs --lista <ruta>` | Cerrar el hueco que el propio guard declara en su salida. Este repositorio es público, así que la lista **no puede** vivir en él. |
| 11 | `develop` va 8 commits por delante de `main`; el despliegue de producción vigente es `916bedb`, así que ocho entregas no están desplegadas | Rodrigo abre el PR `develop → main` con CI en verde y lo mergea él. Ningún agente mergea a `main` (`decisions/0010`) | Que `/noticias`, `/actividad`, los tres fixes de navegador y el canal en tres etapas lleguen al sitio publicado. Hoy están construidos y no desplegados. |
| 12 | El SHA que sirve el dominio no se comprobó contra el sitio, sólo contra el registro de despliegues de GitHub | Correr `vercel ls` / `vercel inspect` con el proyecto enlazado, o abrir `https://rodrigobermejo.com` y contrastar contra `916bedb`. El proyecto no está enlazado en este árbol: `ls -d .vercel` responde *No such file or directory* | Cerrar el único eslabón que separa «GitHub dice que se desplegó `916bedb` con éxito» de «el dominio sirve `916bedb`». Un rollback desde el panel de Vercel es hoy invisible para este documento. |

---

# HISTÓRICO — la tanda del prototipo, cerrada el 2026-09-15

> Todo lo que sigue describe el **prototipo HTML** y el canal editorial en su estado del
> 2026-09-15. Se conserva como registro. **No es el estado vigente del sitio**: ése está
> arriba. Donde una cifra de aquí contradiga una medición de arriba, la de arriba manda.

## Qué funcionaba de verdad en la tanda del prototipo

Cosas con comando detrás, salida pegada y verificación en navegador — **del prototipo**.

| | Evidencia |
|---|---|
| **El canal editorial es idempotente** | Dos corridas sobre las mismas entradas: la primera produce 1 pieza, la segunda `0 nuevos, 50 ya vistos`. Exit 0 en ambas. |
| **Un error de acceso no fabrica una noticia** | El Economista 403 y Anthropic 404 quedan en `errores.jsonl` con código y consecuencia. Cero piezas generadas de esas fuentes. Exit 2, éxito parcial. |
| **La verificación de hechos puede fallar** | Control negativo ejecutado: una cifra inventada da `cifras que no existen en ninguna fuente: 47`; una URL rota da `[404]`; una fecha falsa da `2020-01-01 no aparece; el documento declara 2026-06-18`. Un gate que nunca ha fallado puede estar desconectado. |
| **Una pieza real, con respaldo completado** | `marco-ailit-alfabetizacion-ia-educacion`. Veredicto **`parcial`**: 5 fuentes citadas, 4 leídas, 1 no consultada; **2 de 2 corroborantes**; 4 afirmaciones con pasaje literal; **1 pendiente, señalada en pantalla**; 0 fallos. Revisión humana pendiente y sin publicar. |
| **Leer las fuentes cambió la pieza** | Tres correcciones que salieron de leerlas, no de ajustar el verificador: decía que el marco «alimenta el dominio innovador de PISA 2029» y ninguna fuente dice eso —la Comisión Europea dice que lo «complementa»—; declaraba como fecha de publicación de una fuente la de su **modificación**; y afirmaba que la OCDE estaba bloqueada cuando responde de forma **intermitente**. Las tres están en el registro de correcciones de la pieza. |
| **Dos URLs no son dos corroboraciones** | La OCDE, la Comisión Europea y `ailiteracyframework.org` comparten procedencia: las dos primeras son coautoras del marco y la tercera es el sitio del proyecto. La única voz independiente leída es el Observatorio del Tec, y **no** confirma la fecha. La pantalla lo dice fuente por fuente. |
| **Los filtros filtran** | «Formo» → 2 de 12 proyectos; «Dirijo» → 4; por periodo → 2 y 4; limpiar → 12. Con `aria-pressed` y recuento actualizado. |
| **Accesibilidad medida, no estimada** | 0 fallos de contraste en las cinco pantallas, mínimo 4.67:1. Recorrido de teclado completo con foco visible en las 35 paradas. Sin scroll horizontal a 320, 400, 768 y 1280 px. |
| **La sonda de contraste puede fallar** | Se le inyectó a propósito un par de 1.64:1 y se puso roja. |
| **El canal no se deja usar como proxy** | Una revisión de seguridad encontró SSRF: las URLs vienen de feeds de terceros y se seguían redirecciones a ciegas. Guarda en `red-segura.mjs`, aplicada en la única puerta de red del canal. |
| **El DNS rebinding está cerrado, no «aceptado»** | La versión anterior lo declaraba riesgo residual porque «`--resolve` rompe SNI y virtual hosting». **Era falso** — la documentación de curl dice lo contrario. Ahora el nombre se resuelve una vez, se valida, y esa dirección se **fija** en la conexión conservando Host, SNI y validación de certificado. En cada salto de redirección. |
| **Y está demostrado, no afirmado** | Sin red: un resolutor que contesta público la primera vez y `127.0.0.1` después; la conexión usa la validada y el resolutor se llama **una** vez. Con su control negativo, que reproduce el comportamiento ingenuo y **sí** alcanza el loopback. Con red (`demo-red-fijada.mjs`, 7/7): HTTPS permitido funciona, virtual hosting intacto, y la validación de certificado activa en tres formas. |
| **Tres evasiones más que seguían abiertas** | NAT64 (`64:ff9b::7f00:1`) y 6to4 (`2002:7f00:1::`) salían PERMITIDO: sólo se desenvolvía la forma `::ffff:`. Ahora se comprueban las cuatro maneras de meter una IPv4 dentro de una IPv6. |
| **Las pruebas ya corren en CI** | Defecto encontrado en la revisión: las 114 del canal y la compuerta de exposición no las alcanzaba `npm test`, así que CI nunca las corría y se podía romper la guarda en verde. Ahora `npm test` son **192** y sale con código 1 si la guarda se rompe. Comprobado. **[CIFRA VENCIDA — el 2026-09-28 son 409. Ver «Correcciones previstas que NO ocurrieron» §1.]** |
| **Esas pruebas pueden fallar** | Comprobado rompiendo la guarda a propósito dos veces. Y la primera versión de la prueba del 302 **seguía verde con la guarda rota** —el doble de `fetch` ignoraba la opción `redirect`—: una prueba que no puede ponerse roja no prueba nada. Corregida. |

### Las cinco pantallas del prototipo — HISTÓRICO

> **Estas cinco pantallas NO son la entrega.** Son HTML de prototipo y hoy están
> superadas por `app/` y `components/`. Ver «`docs/plataforma/prototipo/**` es HISTÓRICO»
> arriba. Se conserva la descripción porque documenta de dónde salió la dirección visual.

`portada.html` · `noticias.html` · `noticia.html` · `proyectos.html` · `proyecto.html`,
todas en `docs/plataforma/prototipo/`, navegables entre sí con la misma cabecera.

Dirección visual nueva: **«Redacción»**. Un sistema de **regla y columna** —la gramática
común del periódico y de la tabla— porque la misma superficie tiene que sostener una
redacción y un tablero de datos sin partirse en dos productos. Conserva la paleta y las
familias tipográficas de la marca, con dos valores derivados declarados y medidos.

**Corrección del 2026-09-15.** Esta sección decía «sin tarjetas, que es lo que pediste
evitar». Esa regla me la inventé yo: lo que pediste evitar es **repetir un mismo
componente sin criterio**, que no es lo mismo. Ahora hay tarjeta (`.obra`) **solo donde
hay un artefacto autorizado que enseñar** —dos proyectos de doce—, y el índice completo y
la actividad siguen siendo filas, porque ahí la tarjeta no aporta nada.

Las cinco pantallas se rehicieron el 2026-09-15 con el trabajo al frente: la explicación
de restricciones y funcionamiento interno bajó a desplegables y a una sección de
metodología. Los avisos de simulación, falta de verificación y cobertura **no** bajaron:
se quedan junto al contenido. Comprobado por máquina — **36 avisos en las cinco pantallas
y cero escondidos dentro de un `<details>` cerrado**.

---

## Qué es demostrativo

Marcado en pantalla, no escondido.

- **Dos de las tres piezas del canal** son ilustrativas del formato y llevan la marca
  amarilla `.simulado`. La tercera —la del marco AILit— salió de una ejecución real, tiene
  veredicto `parcial` y no la lleva.
- **Las dos capturas de producto** de `proyecto.html` las generé yo del sitio publicado.
  No existía ninguna captura en el repo: `public/` tiene seis archivos y ninguno es una
  pantalla. Nada las regenera automáticamente, y la pantalla lo dice.
- **La tira de barras mensual** cubre solo el repositorio público del sitio. Trece meses,
  de los cuales nueve tienen fuente. Los meses sin dato no se dibujan como cero.

---

## Qué requiere una decisión tuya

### 1. La enmienda de contrato — `decisions/0015`, ACEPTADA el 2026-09-15

De las siete cosas que pediste ver en proyectos, **tres chocaban con prohibiciones
declaradas permanentes**, escritas además en el JSON Schema ejecutable: `hours`,
`agent_sessions`, `tool_calls`.

La salida no fue levantarlas. `00-product-brief.md:65` las prohíbe **«como indicador de
nada»** — el objeto es el uso, no el número. El ADR introduce una tercera clase,
**declaración de proceso**, con seis condiciones, generalizando una decisión que `02` §8
ya había tomado para la IA: *«anotación de procedencia, no métrica de productividad»*.

Conserva íntegros: score, rank, niveles, «ningún número que resuma a una persona»,
tokens, prompts, y **toda** la política de privacidad.

**Desde su aceptación el 2026-09-15, las autorizaciones A–G y las specs que derivan de
ellas son autoridad.** Esto autoriza el alcance; no afirma que sus mecanismos ya estén
implementados ni publicados.

### 2. La decisión de privacidad que tomé por ti — y que corregí a la baja

**Este repositorio es público.** La entrega anterior sostenía que el agregado de pull
requests de todos tus contextos **sí** era publicable «porque combina organizaciones». **Eso
era falso y lo retiro.** Combinar sujetos es necesario pero no suficiente: si **un solo
sujeto aporta la mayor parte del total**, el total es un proxy de ese sujeto y publicarlo es
publicarlo a él con ruido encima. Lo medí, y eso es exactamente lo que pasa con el agregado
de GitHub.

La conclusión correcta es más restrictiva:

- **De GitHub, hoy solo se publican las cifras que provienen de repositorios públicos.** Son
  las únicas que un tercero puede recontar por su cuenta y las únicas que no revelan volumen
  de trabajo no publicado. En la práctica: el repositorio de este sitio y `habit-tracker`.
- **El agregado total no se publica.** Ni el total, ni su serie mensual, ni el desglose por
  organización, ni ningún par de cortes que se resten entre sí — publicar dos despeja el
  tercero por diferencia, que es el cruce reidentificante de `docs/03` §3 regla 8.
- **El umbral k no lo salva:** k cuenta eventos, no sujetos.
- **La única excepción medida son las horas de M-21** (ver punto 3). Ahí ningún proyecto
  llega a un cuarto del total, así que el agregado no es proxy de nadie y sí pasa la prueba.

Las cifras concretas del agregado y de su reparto **están medidas y retiradas de estos
documentos**; no se copiaron a ningún otro archivo, porque no hay una ubicación privada
autorizada. Están descritas, sin reproducirlas, en `03-catalogo-de-metricas.md`
§Decisiones pendientes. **Si quieres publicar un agregado de GitHub, esa es una decisión
tuya y hace falta tomarla explícitamente.**

La pantalla **dice que no lo publica y por qué, sin decir cuánto**. Explicar la regla da
credibilidad; ilustrarla con el dato real la rompe.

### 3. El tiempo humano ya no es un hueco — y los dos que quedan

1. **Tiempo humano: sí hay fuente, y la entrega anterior se equivocó.** Dije que no existía
   ninguna. Existe: **WakaTime**, con credencial configurada. Sondeado el 2026-09-14 con
   `node scripts/editorial/sonda-wakatime.mjs --dias 30` (no imprime la clave y seudonimiza
   los proyectos): **145.7 h en la ventana de 30 días, con dato en 28 de 31 días** — y
   **516 h con dato en 82 de 91** si la ventana se abre a 90 días, que es la que usa el
   prototipo.
   - **No son «horas trabajadas».** Es tiempo con actividad en un editor instrumentado, con
     timeout de inactividad. No cubre reuniones, diseño, lectura, docencia presencial, ni
     trabajo en una máquina sin el plugin.
   - **Cobertura temporal alta; cobertura del trabajo, desconocida.** 28 de 31 días es lo
     primero. Qué fracción de tu trabajo real cae dentro del editor **no se puede derivar** y
     no se estima.
   - **Publicable con agregación**, con dos condiciones duras: **nunca por proyecto** —los
     nombres de proyecto de WakaTime son nombres de repositorios— y **nunca sumada** a
     duración de ejecuciones de agentes.
   - **Y ningún ratio.** Ahora que hay denominador, dividir es más tentador y sigue igual de
     prohibido: ni horas por commit, ni horas ahorradas, ni % de trabajo hecho por IA.
   - El error de método queda registrado: la búsqueda cubrió el repositorio y Trello, y
     concluyó «no existe» cuando lo correcto era «no existe **aquí**».
2. **Ejecuciones de agentes: el ledger está vacío.** El `ledger/` del motor de evidencia
   contiene un `.gitkeep` de 0 bytes. El repositorio de orquestación de agentes tiene siete
   agentes definidos y **una** línea de heartbeat, del 2026-04-03. Ni las ejecuciones ni su
   duración tienen fuente, y WakaTime no las llena: mide actividad humana, no de agentes.
3. **Participación de IA más allá del trailer de commit.** Lo que sí es medible: 23 de 28
   commits de este repositorio público llevan `Co-Authored-By`. Pero **la serie no es
   comparable entre repos**: donde marca 0 % es un artefacto de cuándo se activó el trailer,
   no una medida de método.

### 4. El detalle detrás de cada cifra llega hasta donde permita `decisions/0013`

`decisions/0013` está **ACEPTADA desde el 2026-09-15** y autoriza el mecanismo de
publicación de registros individuales de `Evidence`. El motor todavía no lo implementa y
continúa abortando si llega evidencia al artefacto; la aceptación no equivale a una
publicación.

---

## Sobre la operación: qué es real y qué no

Lo pediste explícitamente y la respuesta es incómoda.

**No existe un runtime de orquestación funcionando.** Medido:

- Las «ejecuciones» de CI del repositorio de automatización interna son **todas de Copilot
  code review**, un workflow dinámico de GitHub. Cero workflows propios.
- En el repositorio de orquestación, `orchestrator/` contiene **solo archivos `.md`**, y
  `agents/dev-agent` son ocho `.md` y un `memory/` vacío: son personas de agentes, no
  agentes.
- Existe un `setup-cron.sh` apuntando a un VPS, y trae su propia prueba negativa: incluye un
  auto-commit diario a git. Si estuviera corriendo, ese repositorio tendría commits diarios.
  **No se actualiza desde abril.**

**Lo entregado es ejecución local.** El canal se corre a mano y termina: desde el
2026-09-25 son **dos** invocaciones —`node scripts/editorial/generar.mjs` y después
`node scripts/editorial/verificar-canal.mjs`—, más una tercera, `autorizar.mjs`, que es una
decisión humana y no parte de la corrida (`02-editorial.md` §8.1). No hay proceso persistente, ni programador, ni recuperación de errores más allá
del registro. **No se declara operación 24/7 porque no la hay.**

La dependencia concreta para pasar de local a programado: un proceso persistente con
registro consultable. Ni se contrató nada, ni se activó publicación automática.

---

## Un hallazgo que cambia el alcance

**Tu universo de repositorios es mucho más grande que la lista del encargo**, se reparte en
varias organizaciones y **la mayor parte no es pública**. El encargo nombraba cinco
repositorios de dos organizaciones; medí bastantes más, en más organizaciones, y las que
faltaban son donde vive la mayor parte del trabajo. Los conteos —cuántos en total, cuántos
no públicos, cuántos por organización— **están medidos y no se publican aquí**: este
repositorio es público y esos números son, en sí mismos, información sobre trabajo no
publicado. Ver `03-catalogo-de-metricas.md` §Cobertura y §Decisiones pendientes.

El Registry del feed declara **12 proyectos**. No es un error: un proyecto no es un
repositorio. Pero la correlación entre esos 12 proyectos y el universo real de repositorios
es donde está el trabajo, y hoy **no existe**: el ledger está vacío y no hay tabla de alias
de autor. En los repositorios con equipo, además, una parte de los commits es de otras
personas — qué parte es composición de equipo de un proyecto no público y tampoco se
publica.

Entre los repositorios no públicos hay varios de **currícula, plataforma educativa y
certificación**: **evidencia real de las dimensiones LEAD y TEACH que el feed declara y hoy
no puede probar**. Nombrarlos aquí sería publicar la línea de trabajo que todavía no está
publicada, así que se describen por su función y no por su nombre.

---

## Cinco errores míos que corrigieron los agentes

Se registran porque el proceso importa tanto como el resultado.

1. Escribí que el **DOF** tenía el certificado TLS roto y `datos.gob.mx` caído. **Falso**:
   probé la URL equivocada. El DOF tiene API JSON sin llave y es la única fuente oficial
   mexicana con cadencia diaria. Por poco descarto la pieza clave de la cobertura
   regulatoria.
2. Escribí que **El Economista** daba 403 «en todas las rutas». Falso: `/rss/tecnologia`
   da 403, `/rss/ultimas-noticias` da 200.
3. Di **24 PRs** como cifra de tu actividad de 2026 midiendo **un solo repositorio**. El
   número real es de otro orden de magnitud — y resultó no ser publicable, así que el error
   se corrige diciendo que la cifra estaba mal, no sustituyéndola por la buena.
4. Declaré el **tiempo humano** como dato inexistente. Existe: la búsqueda cubrió el
   repositorio y Trello, y no miró fuera. Ver el punto 3 de «Qué requiere una decisión
   tuya».
5. Introduje en `sistema.css` un `.btn:hover` con blanco sobre `#0e8f93` — **3.91:1,
   falla AA**. Lo escaló el agente que construía las noticias, que hizo bien en no tocar
   un archivo ajeno. Corregido cambiando de familia de color en lugar de oscurecer.

---

## Lo que no bloquea esta propuesta

Pediste que los pendientes de titular, localidad y Facebook no la detuvieran. No lo hacen:
el titular se mantiene como en la Fase 1, la localidad sigue retirada a la espera de tu
decisión, y el kit social de la entrega anterior no se tocó.

---

## Archivos

**La entrega — lo que el sitio ejecuta:**

```
app/                                                   las diez rutas; lo que sale en `npm run build`
components/                                            Navbar, Footer, menú móvil, componentes de proof
lib/proof/                                             el lector del feed (server-only)
lib/navegacion.ts                                      el menú: estructura de docs/brand/02, etiquetas de docs/brand/03
scripts/editorial/                                     el canal, Node puro, sin dependencias, tres invocaciones
scripts/capturar-verificacion.mjs                      la pasada de navegador: mide, captura y escribe su manifiesto
scripts/verificar-reglas-de-forma.mjs                  las seis reglas de forma contra el árbol renderizado
scripts/auditoria-exposicion.mjs                       compuerta: detecta fuga de datos privados en el árbol público
scripts/editorial/sonda-wakatime.mjs                   caracteriza la fuente de tiempo humano, sin publicarla
docs/plataforma/verificacion/2026-09-24/manifiesto.json  la evidencia de navegador, atada al SHA 21194ef
```

**La spec — la autoridad:**

```
docs/decisions/0015-actividad-proceso-y-editorial.md   la enmienda, ACEPTADA el 2026-09-15
docs/plataforma/00-resumen-de-entrega.md               este documento
docs/plataforma/01-noticias-y-actividad.md             spec de /noticias y /actividad
docs/plataforma/02-editorial.md                        spec del canal y fuentes verificadas
docs/plataforma/03-catalogo-de-metricas.md             25 métricas (M-01 a M-25) con sus 7 columnas
docs/plataforma/programacion/                          el workflow PREPARADO y DESACTIVADO, y qué falta
```

**HISTÓRICO — informó el diseño, no es la entrega:**

```
docs/plataforma/prototipo/                             las cinco pantallas HTML + sistema.css
docs/plataforma/prototipo/datos/                       fixture no normativo; nadie del canal lo escribe
docs/brand/prototipos/                                 las dos direcciones de marca exploradas
```

**Recuento de métricas, reconciliado:** el catálogo enumera **25** métricas, `M-01` a
`M-25`, y las categorías de su §Resumen suman ahora esas mismas 25. En la entrega anterior
sumaban 24 porque contaban las tres prohibidas por contrato, que están **fuera** de la
tabla a propósito.
