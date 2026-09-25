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
| **GitHub Actions, este repo** | 4 workflows activos (`gh workflow list`), ya sobre **Node 24** (`ci.yml:39`), red saliente. **Cero `schedule`** hoy. T-E1 y T-E3 **cerrados** el 2026-09-24 | **Un almacén externo con respaldo** para el estado y los borradores, que el tope de llamadas ate, que el registro lea el almacén, y —lo que un agente no puede aportar— el movimiento del archivo a `.github/workflows/` y el secret | **No solo la credencial: falta el almacén, y faltan los dos arreglos del canal** |
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

**Lo que sigue abierto son los prerrequisitos 3, 4 y 5 de *Activar*** —el almacén externo, el
tope de llamadas que no ata, y el registro que lee el directorio equivocado—. Ninguno publica
nada sin autorización; los tres hacen que una corrida programada no sirva para lo que dice
servir.

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
| **Límites de duración, piezas y consumo** | `timeout-minutes: 25`. Los que **atan hoy**: el paso *límites de la corrida* rechaza un `limite` fuera de 0–3 antes de gastar un minuto, `--limite N` acota las piezas que se redactan, y `MAX_INTENTOS = 3` topa los reintentos por entrada. El que **no ata**: `EDITORIAL_MAX_LLAMADAS` está declarado con su valor, pero ningún `.mjs` lo lee —medido el 2026-09-24—, así que hoy no protege de nada. Se deja escrito porque es el contrato, y dicho así para que nadie lo cuente como protección: prerrequisito 4 de *Activar* | `env` y pasos *límites de la corrida* y *corrida* |
| **Registros consultables sin contenido sensible** | `registro-de-corridas.mjs` deriva la bitácora a una tabla de contadores y marcas de tiempo: por construcción **sin títulos, URLs, prompts ni nombres de repositorio**. Se escribe en `$RUNNER_TEMP` —fuera del checkout, para no tocar el árbol público ni con un temporal—, un paso verifica que no lleva URLs, y se sube como artefacto con retención de 30 días. **Dicho con precisión: en un repositorio público los artefactos de Actions los puede descargar cualquiera que pueda ver el repositorio, o sea cualquiera.** Lo que hace publicable ese archivo no es un permiso, es que su contenido está saneado por construcción y verificado antes de subirlo | pasos *registro de la corrida*, *el registro no lleva URLs* y *publicar el registro como artefacto* |
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
- **Lo que sí sigue roto, y es nuevo en esta medición:** `registro-de-corridas.mjs:22`
  resuelve su directorio con la constante `scripts/editorial/estado` y **no** consulta
  `EDITORIAL_ESTADO_DIR`. Ese directorio ya no existe, así que el comando imprime
  «0 corrida(s)» y sale 0. Es el defecto de *un cero medido y un cero por falta de dato se
  ven igual*: el registro que el workflow sube como artefacto estaría vacío, y un canal que
  no corrió se leería exactamente igual que uno que corrió bien. Es del canal, no del
  workflow; es el prerrequisito 5 de *Activar*.

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
  no ata** —ningún `.mjs` lo lee, medido el 2026-09-24—, así que lo que acota de verdad el
  gasto de una corrida es `--limite`, topado además a 3 por el primer paso del workflow.

## Activar, cuando se decida

**Cinco prerrequisitos, y ninguno es la credencial. Los dos primeros están cerrados:**

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
   procesar como nuevo todo lo ya visto. **Abierto**, y es la decisión que queda.
4. **Hacer que el tope de llamadas al redactor ate.** `EDITORIAL_MAX_LLAMADAS` está declarado
   en el workflow y ningún `.mjs` lo lee: `invocar-redactor.mjs` tiene que contar sus
   llamadas y abortar al llegar al tope. **Abierto.** Mientras siga así, el único freno a un
   bucle inesperado es `--limite` y el tope de 25 minutos.
5. **Arreglar `registro-de-corridas.mjs` para que lea `$EDITORIAL_ESTADO_DIR`.** Hoy resuelve
   `scripts/editorial/estado` por constante (`registro-de-corridas.mjs:22`), directorio que
   ya no existe: imprime «0 corrida(s)» y sale 0. **Abierto.** Activar con esto roto deja un
   artefacto vacío en el que una corrida que no hizo nada y una corrida que falló entera se
   leen exactamente igual.

Después, cuatro movimientos en este orden:

1. Dar de alta el secret de inferencia y las dos variables del almacén.
2. Mover `canal-editorial.yml` a `.github/workflows/`. **Ese movimiento no lo puede hacer un
   agente**: hace falta un token con alcance `workflow`, y el del agente no lo tiene.
3. Correrlo a mano (`workflow_dispatch`) con `con_redactor: false` y mirar el registro.
4. **Sólo si esa corrida sale bien**, descomentar el bloque `schedule`.

Hasta el paso 4 no hay cron. Y **la autorización** sigue desactivada en cualquier caso: una
corrida programada **jamás autoriza**. Las piezas se quedan en `terminada` —borrador
verificado— y solo Rodrigo, a mano, ejecuta el comando de autorización que escribe en
`content/noticias/`.

Que no autorice **ya sí es lo mismo que no publicar nada**, y decirlo exige nombrar lo que
cambió: mientras existió el paso *persistir estado y corpus* eran dos cosas distintas, porque
ese paso empujaba estado y corpus a este repositorio público sin pasar por ninguna
autorización. T-E3 lo eliminó el 2026-09-24. El resto de los prerrequisitos va **antes** que
estos cuatro movimientos por una razón distinta —una corrida sin almacén, sin tope efectivo
de llamadas y con el registro roto no publicaría nada, pero tampoco serviría para nada—.
