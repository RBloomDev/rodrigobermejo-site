# Ejecución programada del canal editorial — preparada, no activada

> **Estado: PROPUESTA.** Nada de esto corre. El archivo de workflow vive en este
> directorio y **no** en `.github/workflows/`, que es donde GitHub lo buscaría.
> Mientras siga aquí no existe para GitHub: no hay cron, no hay ejecución, no hay
> consumo.
>
> **Autoridad sobre el modelo de etapas y de estado: `docs/plataforma/02-editorial.md` §8.**
> Este documento elige **dónde** correría el canal; no decide dónde vive su estado ni qué
> etapa escribe en el repositorio. Donde este documento y §8 parezcan decir cosas distintas,
> manda §8, y la divergencia es FAIL, no deuda.

Fecha: 2026-09-15 · actualizado el 2026-09-24 · Rama: `chore/programacion-editorial-preparada`

---

## Una configuración preparada no es un servicio activo

Esta es la frase que hay que leer antes que cualquier otra cosa de este directorio, porque
es la que se malinterpreta sola. **Preparada** significa que el archivo existe, es válido,
declara sus límites, y cualquiera puede leer exactamente qué haría. **Activa** significaría
que corre. No corre: `canal-editorial.yml` está en `docs/`, no en `.github/workflows/`, y
GitHub solo mira el segundo. No hay cron —el bloque `schedule` está comentado—, no hay
ejecución, no hay consumo y no hay factura. `scripts/editorial/pruebas/workflow-preparado.test.mjs`
comprueba por máquina que sigue siendo así, y su última prueba comprueba que esas
comprobaciones pueden fallar.

**Y hay dos dependencias que faltan hoy, ninguna de las cuales se puede inventar:**

1. **El token del agente no tiene alcance `workflow`.** Su alcance medido es
   `gist, read:org, repo`. Un commit que tocara `.github/workflows/` sería rechazado al
   empujar, así que el agente **ni siquiera podría instalar el archivo**. No es un obstáculo
   a rodear: es la restricción funcionando. No se puede inventar porque ampliar el alcance de
   un token es una decisión de seguridad de su dueño, y un agente que se concede permisos es
   exactamente lo que esa restricción existe para impedir.
2. **No existe una credencial de inferencia utilizable sin sesión interactiva.** Medido:
   `gh secret list` devuelve vacío en los tres repos del núcleo. El redactor se invoca hoy
   con una sesión interactiva del CLI, que un runner no tiene. No se puede inventar porque
   una llave de API es un secreto con coste: la crea quien paga su consumo, y no se reutiliza
   la de otro servicio ni se extrae de una sesión personal —el detalle, en *La decisión
   concreta que hace falta*—.

Con `con_redactor: false` —el valor por defecto— la segunda no hace falta: esa corrida
detecta y deduplica sin invocar al modelo. La primera hace falta siempre, porque sin ella el
archivo no llega a instalarse.

---

## Dónde podría correr, con lo que ya existe

Se midieron cinco opciones. Cada fila lleva el comando que la produjo.

| Opción | Qué hay ya | Qué falta | ¿La credencial es el bloqueo? |
|---|---|---|---|
| **GitHub Actions, este repo** | 4 workflows activos (`gh workflow list`), ya sobre **Node 24** (`ci.yml:39`), red saliente. **Cero `schedule`** hoy. T-E1 y T-E3 **cerrados** el 2026-09-24, y el registro ya lee el almacén el 2026-09-25 | **Un almacén externo con respaldo** para el estado y los borradores, que el tope de llamadas ate, y —lo que un agente no puede aportar— el movimiento del archivo a `.github/workflows/` y el secret | **No solo la credencial: falta el almacén, y falta que el tope de llamadas ate** |
| VPS propio | Corre crons hoy (`/etc/cron.d/vps-monitor`, cada 5 min) y tiene secrets de acceso vivos | Runtime de Node —sin evidencia de que exista ahí— y acceso SSH para el agente | Sí, más un segundo hueco |
| n8n autoalojado | Crons corriendo hoy, varios workflows activos | Dispara, **no ejecuta Node**. Habría que reescribir la redacción como nodos | Parcialmente |
| n8n personal | 137 workflows, **todos los listados inactivos** | Todo | Sí |
| Vercel cron | — | **No hay `vercel.json` ni `vercel.ts`**. Invoca una ruta HTTP y no persiste ficheros | Sí, y el modelo no encaja |

**Recomendación: GitHub Actions en este mismo repositorio, condicionada al almacén** —T-E1 y
T-E3, las otras dos condiciones, están cerradas—. Y el orden importa: **un runner es efímero,
así que no tiene persistencia local ni respaldo** (`02-editorial.md` §8.5). Son dos cosas
distintas y las dos faltan aquí. Declarar variables de entorno no proporciona ninguna de las
dos: solo dice a dónde escribir.

**Commitear el estado y los borradores al repositorio no es la solución, y este documento ya
no la propone.** Este repositorio es público: versionar la bitácora y las redacciones publica
trabajo que todavía no es una decisión, y lo hace en silencio, sin que nadie autorice nada.
La política es que el árbol público lo escriba **únicamente** el comando de autorización, y
solo en `content/noticias/` (`02-editorial.md` §8.3). **El comando existe desde el
2026-09-24** —`scripts/editorial/autorizar.mjs`, §8.4 y §8.8— y es la única ruta al árbol
público. `content/noticias/` sigue sin existir porque nadie ha autorizado nada todavía, que
es el estado correcto de un corpus vacío, no un pendiente.

La propuesta no requiere contratar un servicio para *ejecutar*. Sí requiere resolver **dónde
persiste el estado con respaldo** cuando el canal deje de correr en la máquina de Rodrigo.
Elegir ese almacén no se decide en este documento.

---

## Qué correría, exactamente: dos etapas de tres

El canal **se parte** en tres comandos (`02-editorial.md` §8.1) —hoy `generar` y `verificar`
siguen dentro de `ejecutar.mjs`, y partirlos es la tarea que queda de esa línea; `autorizar`
ya existe aparte desde el 2026-09-24—, y una corrida programada ejecutaría **dos** de los
tres:

| Etapa | ¿Corre en el cron? | Escribe en |
|---|---|---|
| **Generar** | Sí | El almacén privado de borradores (`EDITORIAL_REDACCIONES_DIR`) y el estado |
| **Verificar** | Sí | El sello sobre ese mismo borrador privado, y el estado |
| **Autorizar** | **Nunca** | `content/noticias/`, en el árbol de trabajo, y solo cuando Rodrigo lo ejecuta a mano |

**La programación automatiza el trabajo, no la decisión.** Una corrida desatendida deja
piezas en `terminada` —borrador verificado— y ahí se detiene. Que `autorizar` no exista en el
workflow es la razón por la que, **cerrados T-E1 y T-E3**, activar el cron no cambiaría qué
se vuelve público: el runner no necesita ninguna ruta hacia el árbol público del repositorio.
**Las dos condiciones eran necesarias y ninguna bastaba sola**, porque eran dos caminos
distintos hacia el árbol público:

- **T-E1** —el reparto de trabajo de `02-editorial.md` §8.6— parte el canal en los tres
  comandos de §8.1, saca el estado del repositorio, hace obligatorias las dos variables y
  entrega la compuerta de CI. Sin él, el propio canal escribe dentro del repositorio.
- **T-E3** (`chore/programacion-editorial-preparada`) es el trabajo sobre **este directorio**:
  borra del workflow el paso *persistir estado y corpus*. Sin él, aunque el canal ya no
  escribiera nada dentro del repositorio, **el workflow seguiría commiteando y empujando** lo
  que encuentre.

**Los dos están cerrados desde el 2026-09-24**, y conviene decir qué cerró cada uno porque
eran dos caminos distintos y ninguno bastaba solo. T-E1 sacó el estado del repositorio.
T-E3 borró del workflow el paso *persistir estado y corpus* —el `git add` + `git commit` +
`git push` de la bitácora y del corpus— y añadió las dos cerraduras que impiden que vuelva:
`permissions: contents: read` y un checkout **sin credenciales persistidas**. Un paso que lo
intentara hoy no tendría ni permiso ni credencial. Lo comprueba
`scripts/editorial/pruebas/workflow-no-commitea-estado.test.mjs`, y el paso que mide que el
árbol de trabajo quedó intacto al final de la corrida —en vez de confiar en que no hay un
paso que lo ensucie— lo vigila `workflow-preparado.test.mjs`, en el mismo directorio.

**Lo que sigue abierto son los prerrequisitos 3 y 4 de *Activar*** —el almacén externo y el
tope de llamadas que no ata—. El 5, el registro que leía el directorio equivocado, se cerró el
2026-09-25. Ninguno de los dos publica nada sin autorización; los dos hacen que una corrida
programada no sirva para lo que dice servir.

Consecuencia directa sobre este documento: un runner **no debe commitear nada**. Ni estado,
ni borradores, ni corpus. Lo que produce lo deja en el almacén externo; lo que ese almacén
tiene que garantizar está en la tabla siguiente.

---

## Los seis requisitos, y cómo los cubriría la configuración

La columna «Cómo» describe la configuración **propuesta**, no una que esté corriendo: el
workflow no está instalado y el bloque de medición que sigue a la tabla dice qué falta.

| Requisito | Cómo | Dónde |
|---|---|---|
| **Persistencia de pendientes y resultados** | El estado y los borradores viven **fuera de cualquier repositorio**: `EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` son **obligatorias, sin valor por defecto**, y sin ellas el canal **aborta** antes de escribir nada (`02-editorial.md` §8.3). En un runner efímero eso obliga además a un **almacén externo con respaldo**: un directorio local da persistencia local, no respaldo, y el runner no da ni eso | entorno de ejecución |
| **Exclusión de ejecuciones simultáneas** | `concurrency.group` nativo de Actions, con un group **fijo**: no lleva `github.ref` ni `github.run_id`, porque el recurso que se disputa es uno solo —la bitácora— y un group por rama daría dos corridas simultáneas sobre el mismo estado. `cancel-in-progress: false` a propósito: **se encola, no se mata**. Matar a mitad deja trabajo en un estado que nadie cerró | bloque `concurrency` |
| **Reintentos limitados y recuperación** | `MAX_INTENTOS = 3` por entrada en la máquina de estados; a la tercera se descarta con motivo. La corrida **arranca de la bitácora, no del feed**: lo que quedó a medias vuelve a la cola antes que lo detectado hoy | `estado.mjs`, `ejecutar.mjs` |
| **Límites de duración, piezas y consumo** | `timeout-minutes: 25`. Los que **atan hoy**: el paso *límites de la corrida* rechaza un `limite` fuera de 0–3 antes de gastar un minuto, `--limite N` acota las piezas que se redactan, y `MAX_INTENTOS = 3` topa los reintentos por entrada. El que **no ata**: `EDITORIAL_MAX_LLAMADAS` está declarado con su valor, pero **nadie lo lee del entorno** —vuelto a medir el 2026-09-25: `grep -rn "process.env.EDITORIAL_MAX_LLAMADAS" scripts/ lib/ app/` sale vacío, y ningún `.mjs` de producción lo nombra siquiera; las cuatro líneas que devuelve el grep suelto son de `workflow-preparado.test.mjs`, que comprueba que el YAML lo **declara**, no que alguien lo obedezca—, así que hoy no protege de nada. Se deja escrito porque es el contrato, y dicho así para que nadie lo cuente como protección: prerrequisito 4 de *Activar* | `env` y pasos *límites de la corrida* y *corrida* |
| **Registros consultables sin contenido sensible** | `registro-de-corridas.mjs` deriva la bitácora a una tabla de contadores y marcas de tiempo: por construcción **sin títulos, URLs, prompts ni nombres de repositorio**. **Lee** la bitácora de `$EDITORIAL_ESTADO_DIR` resuelta con `dirEstado()` —desde el 2026-09-25; antes usaba una constante del repositorio y devolvía «0 corrida(s)» sin que nada fallara— y **se escribe** en la ruta que devuelve `ruta-estado.mjs` —`$EDITORIAL_ESTADO_DIR` ya **validada**, no la variable cruda: el almacén externo, fuera de todo árbol de git— con el número de corrida en el nombre, y un paso verifica que no lleva URLs. **No se sube como artefacto, y eso es la decisión**: en un repositorio público los artefactos de Actions los descarga cualquiera que pueda ver el repositorio, y `actions/upload-artifact` no tiene ninguna opción de ACL. Sanear el contenido no vuelve privado el artefacto: vuelve publicable su contenido, que es otra cosa. Ver *El registro no se publica* | pasos *registro de la corrida* y *el registro no lleva URLs* |
| **Credencial y forma segura de suministrarla** | Secret del repositorio, leído del entorno. Nunca en el archivo, nunca en la línea de comandos | `env.ANTHROPIC_API_KEY` |

**Estado real, vuelto a medir el 2026-09-24.** Las tres primeras mediciones de esta lista
decían que la política no se cumplía; cerradas T-E1 y T-E3, ya no dicen eso. Se conserva lo
que decían tachado, porque una lista que se reescribe borra la evidencia de qué se arregló.

- ~~`git ls-files scripts/editorial` devuelve `estado/bitacora.jsonl`, `estado/errores.jsonl`,
  `estado/fallos.jsonl`, `estado/vistos.jsonl` y
  `redacciones/marco-ailit-alfabetizacion-ia-educacion.json`.~~ **Ya no.**
  `git ls-files scripts/editorial` devuelve dieciocho archivos y **ninguno** bajo `estado/`
  ni `redacciones/`: los dos directorios ni siquiera existen en el árbol. El estado salió del
  repositorio público con T-E1.
- ~~Las variables tienen *fallback* dentro del repositorio (`estado.mjs:153`,
  `ejecutar.mjs:66`).~~ **Ya no.** `grep -n "EDITORIAL_ESTADO_DIR ||"` no devuelve ninguna
  línea de código: `comun.mjs` resuelve las dos por `exigirDirectorio()`, que **aborta** si
  la variable falta y **rechaza** la ruta si cae dentro de un árbol de trabajo de git. Las
  únicas menciones de `||` que quedan están en comentarios que explican qué se quitó.
- ~~El workflow de este directorio contiene el paso *persistir estado y corpus*
  (`canal-editorial.yml:183`), que hace `git add`, commitea y empuja a la rama de trabajo.~~
  **Eliminado el 2026-09-24 (T-E3).** En su lugar quedan tres cosas, y son tres porque una
  sola sería una promesa: `permissions: contents: read` —sin `contents: write`, que era lo
  que sostenía el `push`—, `persist-credentials: false` en el checkout —sin credencial no hay
  empuje aunque alguien reponga el paso— y el paso *el árbol de trabajo quedó intacto*, que
  falla la corrida si encuentra cualquier cosa escrita dentro del repositorio.
  `scripts/editorial/pruebas/workflow-no-commitea-estado.test.mjs` lo comprueba sobre el
  archivo, y demuestra que puede fallar reponiendo el paso borrado en una copia mutada.
- ~~No existe `content/noticias/` ni el estado `autorizada`.~~ **Vuelto a medir el
  2026-09-24: los dos existen.** `scripts/editorial/autorizar.mjs` es el único camino al
  corpus y `estado.mjs` ya tiene la transición `terminada → autorizada`. El corpus
  publicado sigue **vacío**, que es otra cosa: el mecanismo existe y nadie ha autorizado
  nada todavía.
- ~~`registro-de-corridas.mjs:22` resuelve su directorio con la constante
  `scripts/editorial/estado` y **no** consulta `EDITORIAL_ESTADO_DIR`. Ese directorio ya no
  existe, así que el comando imprime «0 corrida(s)» y sale 0.~~ **Arreglado el 2026-09-25.**
  Lo encontró la revisión de T-E3 y se cerró en la misma entrega en vez de dejarlo como
  salvedad: el comando resuelve ahora con `dirEstado()` —la validación canónica del canal— y
  **aborta con código 1** si falta la variable, con el error saneado de `ruta-estado.mjs`
  (variable y código, nunca la ruta). Era el defecto de *un cero medido y un cero por falta
  de dato se ven igual*: el registro que el workflow escribía en el almacén salía vacío, un
  canal que no corrió se leía igual que uno que corrió bien, y los dos pasos del workflow que
  dependen de este comando eran compuertas verdes sobre un archivo vacío.

Sacar los archivos del repositorio y hacer obligatorias —sin fallback—
`EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR` lo hizo **T-E1**; partir el canal en los
tres comandos de `02-editorial.md` §8.1 sigue pendiente, y es de la tarea que parta
`ejecutar`. **Eliminar del workflow el paso *persistir estado y corpus* no era de T-E1: era
de T-E3**, el trabajo sobre este directorio, y está hecho. Sus valores concretos viven
únicamente en el `.env`
local de Rodrigo; este documento no declara rutas. **Las variables obligatorias son dos, y
`EDITORIAL_PIEZAS` no es una de ellas: T-E1 la elimina, no la renombra** (`02-editorial.md`
§8.3 y §8.6, fila 2). El corpus intermedio que esa variable apunta deja de existir, porque
el borrador vive en `EDITORIAL_REDACCIONES_DIR` y lo único que llega al árbol público lo
escribe `autorizar` en `content/noticias/`.

**Lo que T-E1 cerró de esa fila y lo que no.** T-E1 quitó el respaldo al repositorio:
`rutaPiezas()` devuelve `null` sin la variable y la corrida no escribe corpus en ningún
sitio, así que el `||` ya no existe. La **eliminación** de la función y la variable queda
para la tarea que parta `ejecutar` en `generar` y `verificar`: añadir `autorizar` (2026-09-24)
no la toca, porque el corpus intermedio que `rutaPiezas()` resuelve sigue siendo el que esa
corrida escribe. Está declarado así en `02-editorial.md` §8.6, al cierre
de la sección, y en el comentario de `ejecutar.mjs` sobre la propia función.

Hay además una compuerta que no estaba en la lista: `auditoria-exposicion.mjs`. Este
repositorio es público y la corrida acaba de escribir en disco; si algo nombra un repositorio
privado, se para ahí. Corre **inmediatamente después de la corrida y antes de cualquier paso
que produzca o publique algo**, y con `always()`, porque una corrida que falla a mitad ya
escribió y es justo la que hay que auditar. **No es la que sostiene esta política:** una
auditoría que corre después de escribir revisa lo que ya se escribió. Lo que impide publicar
estado es que el estado no esté nunca dentro del repositorio.

Su límite, medido y no suavizado: corre **sin `--gh`**, así que solo aplica los patrones que
no necesitan conocer los nombres privados. Con `--gh` los pediría a la API, y el
`GITHUB_TOKEN` de un runner no puede enumerar las organizaciones del usuario: devolvería
exit 2 —«comprobación no realizada»—, que es peor que el modo reducido porque parece una
comprobación. Es una mitigación acotada, como las demás de `04-architecture.md` §4.1.

### El registro no se publica, y «artefacto privado» no existe

Hasta el 2026-09-24 este documento y el workflow describían el registro de la corrida como un
**artefacto privado**. Eso no existe, y conviene dejar escrito por qué en vez de corregirlo en
silencio:

- En un repositorio **público**, los artefactos de una corrida de Actions los puede descargar
  cualquiera que pueda ver el repositorio —o sea, cualquiera—. `actions/upload-artifact` no
  tiene ninguna opción de ACL: no hay forma de subir un artefacto y restringir quién lo baja.
- **Sanear el contenido no vuelve privado el artefacto.** Vuelve publicable su contenido, que
  es otra cosa. El paso *el registro no lleva URLs* mide lo segundo y no puede dar lo primero;
  confundir las dos cosas era el defecto.

Así que el paso de subida se retiró y el registro se queda en `$EDITORIAL_ESTADO_DIR`, fuera de
todo árbol de git, con el número de corrida en el nombre. Tener un registro descargable exigiría
una de dos cosas: **o el repositorio es privado, o el registro va a un destino externo con
credencial**. Las dos caen dentro del prerrequisito 3 —elegir el almacén externo—, que sigue
abierto.

**Y una regla que sobrevive al paso retirado, porque es la parte reutilizable:** si algún día un
paso publica algo, su `if` tiene que depender de que las compuertas hayan **PASADO**
(`steps.exposicion.outcome == 'success'`), nunca de `always()`. El paso retirado compartía
condición con las tres compuertas, así que habría subido el archivo igual aunque *el registro no
lleva URLs* acabara de fallar: una compuerta que no puede detener lo que viene después no es una
compuerta, es un mensaje de log.
`scripts/editorial/pruebas/workflow-preparado.test.mjs` comprueba las dos mitades: que hoy no hay
ningún paso que publique, y que un paso repuesto con `always()` pone la prueba roja.

> **Esta formulación está SUPERADA, y se conserva sólo como el primer intento.** Decía
> «los pasos que quedan sí pueden usar `always()` porque ninguno publica nada», y eso es
> falso por estrecho: lo que hace peligroso a `always()` no es publicar, es escribir después
> de un rechazo. Manda la sección *La regla, en su forma general*, aquí abajo.

**Publicar no es solo subir un artefacto**, y la corrección vale para todos los canales que son
públicos por defecto, no solo para el que se encontró primero. El resumen del job
—`$GITHUB_STEP_SUMMARY`— se renderiza en la página de la corrida, y en un repositorio público esa
página la ve cualquiera: es la misma clase que el artefacto por otra puerta. Cuenta como
publicación en la prueba, y hoy ningún paso escribe ahí.

### La regla, en su forma general: todo paso con `always()`, no el del registro

Las dos formas de arriba son estrechas —una mira los pasos que publican, la otra los que nombran
la ruta validada— y entre las dos quedaba un hueco: **un paso con `always()` que escribiera en
cualquier otro sitio no lo miraba ninguna**. Y ese es el hueco por el que vuelve F-01 con otro
destino, porque lo que hace peligroso a `always()` no es dónde escribe: es que corre **después**
de que una compuerta haya dicho que no. La regla, entonces, no es sobre el paso del registro:

> **Todo paso con `always()` cumple una de tres: no escribe, o exige que una compuerta anterior
> haya PASADO (`steps.<id>.outcome == 'success'`), o revalida por su cuenta lo que esa compuerta
> rechazó.**

Los cuatro pasos con `always()` del archivo se comprobaron uno por uno, no el que el enunciado
nombraba, y la cuenta real es **tres que no escriben y uno que escribe**:

| Paso | ¿Escribe? | Su `if`, y por qué |
|---|---|---|
| *compuerta de exposición* | No: corre un script de sólo lectura | `!= 'skipped'` sobre la corrida |
| *el registro no lleva URLs* | No: es un `grep -Eq` | cuelga de `dirs_privados` por la ruta que lee |
| *el árbol de trabajo quedó intacto* | **No**: `git status --porcelain`, un `[ -e ]` y dos `echo` a stdout | `!= 'skipped'`, **no** `== 'success'`, y es deliberado: tiene que medir el árbol **también cuando la validación falló** —el caso F-01, justo cuando alguien pudo escribir donde no debía—. «Alinearlo» a `== 'success'` sería la regresión, no el arreglo |
| *registro de la corrida* | **Sí**, y es el único | `steps.dirs_privados.outcome == 'success'` |

**Su límite, dicho para no venderla por más de lo que mide:** la prueba lee la **forma del
shell**. Un paso cuyo `run` sea `node algo.mjs` y cuyo `algo.mjs` escriba pasa por «no escribe»,
porque el analizador no entra en el script. De los tres que se acogen a esa rama —el script de
exposición, el `grep` y el `git status`—, el único cuyo cuerpo es código de este repositorio, y
por tanto el único que hay que medir, es `auditoria-exposicion.mjs`: sus únicos usos de `node:fs`
son `readFileSync`, `existsSync`, `statSync` y `readdirSync`, y **tampoco escribe por
subproceso** —sus tres `execFileSync` de `node:child_process` son `gh api` y `gh repo list`,
lectura pura, y además sólo se alcanzan con `--gh`, bandera que el workflow no pasa—. Decirlo
sólo de `node:fs` dejaba fuera media superficie: un subproceso puede escribir y ningún grep de
`node:fs` lo vería. Lo que respalda esa rama por ejecución es el último paso del job, *el árbol
de trabajo quedó intacto*, que corre después de todos. Es una mitigación acotada, como las de
`04-architecture.md` §4.1, y no una garantía.

**Y la rama «espera a una compuerta» no acepta cualquier paso.** La prueba restringe el `if` a
una allowlist de compuertas —`dirs_privados`, `exposicion`, `registro_sin_urls`— y exige que el
paso nombrado **aparezca antes** en el mismo job. Sin las dos cosas, `steps.corrida.outcome ==
'success'` habría pasado por autorización y la corrida no comprueba ni destino ni exposición; y
una compuerta posterior no puede detener lo que ya se escribió.

### El destino de una escritura se valida antes de escribir, no después

La regla de arriba tenía una segunda mitad que faltaba, y la encontró la revisión del
2026-09-24 (hallazgo F-01). Un paso con `always()` no publicaba nada —eso estaba bien— pero
**escribía**: el registro salía de `mkdir -p "$EDITORIAL_ESTADO_DIR"` y una redirección del
shell. Y el shell no sabe nada de §8.3. Con `EDITORIAL_ESTADO_DIR` apuntando dentro del
checkout, el canal rechazaba la ruta y abortaba —`ejecutar.mjs` sí valida—, pero el paso del
registro corría igual, **después** del rechazo, y creaba el directorio dentro del
repositorio público.

Lo que hacía el defecto difícil de ver es que la mitigación que debía detectarlo no podía:
`/scripts/editorial/estado/` está en el `.gitignore`, y `git status --porcelain` **no lista
lo ignorado**. El paso *el árbol de trabajo quedó intacto* habría dado verde sobre un
archivo recién escrito en el árbol público.

Se cierra con dos cerraduras, por delante y por detrás, porque una sola vuelve a ser una
promesa:

1. **Por delante.** El paso *los directorios privados están fuera de git* resuelve el
   destino con `scripts/editorial/ruta-estado.mjs`, que aplica la validación **canónica**
   del canal (`exigirDirectoriosPrivados()`, no una copia) y solo imprime la ruta si la
   acepta. Los pasos que escriben usan esa ruta ya resuelta, y su `if` exige además que esa
   validación haya **PASADO** —`steps.dirs_privados.outcome == 'success'`—, que es la misma
   regla que ya regía para publicar, aplicada ahora a escribir. El mensaje de error nombra
   la variable y el código, **nunca la ruta**: el registro de una corrida de Actions en un
   repositorio público lo lee cualquiera.
2. **Por detrás.** El paso que mide el árbol comprueba también, por nombre, que no existan
   `scripts/editorial/estado` ni `scripts/editorial/redacciones` —lo que `git status` no
   puede ver—.

Las dos se prueban, y en dos planos distintos: `workflow-preparado.test.mjs` comprueba sobre
el archivo que ninguna escritura sale de una ruta sin validar, y que quitar cualquiera de las
dos cerraduras pone la prueba roja; `directorio-fuera-de-git.test.mjs` lo comprueba **por
ejecución**, contra un árbol de git real montado en `tmpdir` con el destino ignorado: el
script sale distinto de 0, no imprime destino, no crea el directorio —y de paso demuestra que
`git status --porcelain` no habría visto el archivo, que es por qué hace falta la segunda—.

---

## Qué funciona localmente y qué no se ha probado en el entorno de ejecución

Esta distinción es la que importa, y no se difumina.

**Probado localmente, con salida pegada en el PR:**

- Las cuatro etapas del canal de punta a punta —detectar, deduplicar, redactar,
  verificar—, contra fuentes reales, **en un solo comando**: la separación en tres
  comandos de `02-editorial.md` §8.1 todavía no existe en el código.
- Idempotencia: una segunda corrida sobre las mismas entradas no duplica.
- Recuperación: lo pendiente sobrevive al fallo y vuelve a la cola.
- Reintentos topados: tres fallos descartan con motivo.
- `--limite` acota de verdad, incluido `--limite 0` (arreglado en esta entrega:
  antes significaba «sin límite», que es lo contrario).
- `registro-de-corridas.mjs` produce el registro saneado.
- `auditoria-exposicion.mjs --gh` sale limpio.

**NO probado en GitHub Actions, y no lo voy a presentar como si lo estuviera:**

- Que el CLI de inferencia autentique con una API key dentro de un runner. **Es
  el primer supuesto a comprobar**, y puede obligar a usar
  `CLAUDE_CODE_OAUTH_TOKEN` (que genera `claude setup-token`) en vez de
  `ANTHROPIC_API_KEY`. No se ha podido probar porque el secret no existe:
  medido, `gh secret list` devuelve vacío en los tres repos del núcleo.
- Que el estado sobreviva a una corrida en un runner. **El camino de commitear de vuelta a
  la rama queda retirado del modelo** (`02-editorial.md` §8.3) **y el paso ya no está en el
  árbol**: lo borró T-E3 el 2026-09-24. Así que lo que hay que probar es el almacén externo
  con respaldo, y ese almacén todavía no está elegido: hoy `EDITORIAL_ESTADO_DIR` y
  `EDITORIAL_REDACCIONES_DIR` se leen de variables del repositorio que **no existen**, y el
  primer paso del workflow aborta si vienen vacías en vez de inventar un directorio del
  runner —que daría cero persistencia y reprocesaría como nuevo todo lo ya visto—.
- El comportamiento real del `concurrency` bajo dos corridas solapadas.
- Cuánto tarda una corrida completa en un runner, contra los 25 minutos de tope.

**Una corrida manual (`workflow_dispatch`) con `con_redactor: false` no necesita
credencial y comprobaría casi todo lo anterior** salvo la inferencia. Es el primer paso de
prueba, y **T-E1 y T-E3 ya no lo bloquean**: lo que queda por delante es el almacén externo
del prerrequisito 3, sin el cual la corrida aborta en su primer paso en vez de correr sobre
un directorio vacío. Conviene recordar por qué importaba la distinción: el paso *persistir
estado y corpus* no distinguía una corrida manual de una programada, así que mientras existió
no había forma de «solo probar».

---

## La decisión concreta que hace falta

Una sola, y es de Rodrigo:

> **Crear una credencial de inferencia utilizable sin sesión interactiva y darla
> de alta como secret del repositorio.**

Detalles para tomarla con la información completa:

- **Qué es:** una llave **nueva**, de la consola de Anthropic (`ANTHROPIC_API_KEY`)
  o un token de CLI generado con `claude setup-token`
  (`CLAUDE_CODE_OAUTH_TOKEN`).
- **De dónde NO sale:** no se reutiliza ninguna credencial de otro servicio ni se
  extrae de ninguna sesión personal. La única llave de Anthropic que existe hoy
  en la infraestructura vive dentro de n8n, pertenece a otra persona y a su
  proyecto, y n8n no devuelve su valor. **No es candidata.**
- **Quién la da de alta:** Rodrigo, en *Settings → Secrets and variables →
  Actions*. El agente no puede: su token tiene alcance `gist, read:org, repo` y
  **no** tiene `workflow`, así que tampoco puede instalar el archivo de workflow.
  Eso no es un obstáculo a rodear: es la restricción funcionando.
- **Coste:** es consumo de API por corrida. Con `--limite 1` es una redacción más
  los juicios de verificación. El tope de `EDITORIAL_MAX_LLAMADAS` **está declarado pero hoy
  no ata** —nadie lo lee del entorno y ningún `.mjs` de producción lo nombra, vuelto a medir
  el 2026-09-25—, así que lo que acota de verdad el
  gasto de una corrida es `--limite`, topado además a 3 por el primer paso del workflow.

## Activar, cuando se decida

**Cinco prerrequisitos, y ninguno es la credencial. Tres están cerrados; quedan el 3 y el 4:**

1. ~~**Cerrar T-E1, con la compuerta de CI que lo sostiene**~~ (`02-editorial.md` §8.6).
   **Cerrado.** El estado y los borradores salieron del repositorio, las dos variables son
   obligatorias y sin valor por defecto, y `npm run guard:estado-editorial` impide que un
   `git add` distraído lo reabra en silencio.
2. ~~**Cerrar T-E3: borrar del workflow el paso *persistir estado y corpus*.**~~ **Cerrado el
   2026-09-24.** El paso ya no existe, `permissions` pide solo lectura, el checkout no
   persiste credenciales, y un paso mide que el árbol de trabajo quedó intacto.
   `scripts/editorial/pruebas/workflow-no-commitea-estado.test.mjs` lo vigila y demuestra que
   puede fallar.
3. **Elegir el almacén externo con respaldo** y probar una restauración. Un runner no tiene
   persistencia local ni respaldo; sin almacén, cada corrida arranca sin bitácora y vuelve a
   procesar como nuevo todo lo ya visto. **Abierto**, y es la decisión que queda. Es también
   lo único que podría dar un registro descargable sin publicarlo: mientras este repositorio
   sea público, subirlo como artefacto es publicarlo —ver *El registro no se publica*—.
4. **Hacer que el tope de llamadas al redactor ate.** `EDITORIAL_MAX_LLAMADAS` está declarado
   en el workflow y ningún `.mjs` de producción lo lee: `invocar-redactor.mjs` tiene que contar sus
   llamadas y abortar al llegar al tope. **Abierto.** Mientras siga así, el único freno a un
   bucle inesperado es `--limite` y el tope de 25 minutos.
5. ~~**Arreglar `registro-de-corridas.mjs` para que lea `$EDITORIAL_ESTADO_DIR`.**~~
   **Cerrado el 2026-09-25**, en la misma entrega que lo encontró. Resuelve con `dirEstado()`
   —la validación canónica— y aborta con código 1 si falta la variable, con el error saneado:
   la variable y el código, nunca la ruta. Ya no hay forma de que un registro vacío por falta
   de configuración se lea igual que una corrida que no hizo nada.

Después, cuatro movimientos en este orden:

1. Dar de alta el secret de inferencia y las dos variables del almacén.
2. Mover `canal-editorial.yml` a `.github/workflows/`. **Ese movimiento no lo puede hacer un
   agente**: hace falta un token con alcance `workflow`, y el del agente no lo tiene.
3. Correrlo a mano (`workflow_dispatch`) con `con_redactor: false` y leer el registro **en el
   almacén externo**: no se sube como artefacto, y la bitácora de Actions solo dice si el
   paso salió verde.
4. **Sólo si esa corrida sale bien**, descomentar el bloque `schedule`.

Hasta el paso 4 no hay cron. Y **la autorización** sigue desactivada en cualquier caso: una
corrida programada **jamás autoriza**. Las piezas se quedan en `terminada` —borrador
verificado— y solo Rodrigo, a mano, ejecuta el comando de autorización que escribe en
`content/noticias/`.

Que no autorice **ya sí es lo mismo que no publicar nada**, y decirlo exige nombrar lo que
cambió: mientras existió el paso *persistir estado y corpus* eran dos cosas distintas, porque
ese paso empujaba estado y corpus a este repositorio público sin pasar por ninguna
autorización. T-E3 lo eliminó el 2026-09-24. El resto de los prerrequisitos va **antes** que
estos cuatro movimientos por una razón distinta —una corrida sin almacén y sin tope efectivo
de llamadas no publicaría nada, pero tampoco serviría para nada—.
