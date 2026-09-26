# 02 — El cuerpo del PR de esta entrega

> **Esto no es especificación.** Es el texto literal del PR de la rama
> `chore/programacion-editorial-preparada`, escrito aquí porque quien construyó la rama no
> abre el PR —no empuja ni mergea— y el criterio de aceptación AC-PRG-05 se comprueba
> leyendo el cuerpo del PR. Dejarlo en el chat de una sesión es dejarlo donde nadie lo
> vuelve a encontrar. Quien abra el PR usa este archivo tal cual:
> `gh pr create --base develop --body-file docs/plataforma/programacion/02-el-pr-de-esta-entrega.md`.
>
> La autoridad sobre lo que el canal hace sigue siendo `docs/plataforma/02-editorial.md` y
> `00-donde-correria.md` de este mismo directorio. Si este archivo los contradice, este
> archivo está mal.

---

## Programación del canal editorial: PREPARADA y DESACTIVADA

**Una configuración preparada no es un servicio activo.** Es la frase que hay que leer
antes que ninguna otra de este PR, porque es la que se malinterpreta sola, y es
literalmente lo que este PR entrega: un archivo de workflow completo, válido y medido, que
**no corre**.

- **Preparada** significa que el archivo existe, es YAML válido, declara sus límites, y
  cualquiera puede leer exactamente qué haría si alguien lo instalara.
- **Activa** significaría que corre. No corre.

`canal-editorial.yml` vive en `docs/plataforma/programacion/`, **no** en
`.github/workflows/`, que es el único lugar donde GitHub lo buscaría. Mientras siga ahí:
**no hay cron** —el bloque `schedule` está comentado—, **no hay ejecución**, **no hay
consumo** y **no hay factura**. Activarlo es una decisión de Rodrigo y un movimiento de
archivo, y las dos cosas son suyas.

Esto no es una promesa: `scripts/editorial/pruebas/workflow-preparado.test.mjs` comprueba
por máquina que el archivo **no** está en `.github/workflows/`, y su última prueba comprueba
que esas comprobaciones pueden ponerse rojas.

---

## Las dos dependencias que HOY faltan, y por qué no se pueden inventar

Ninguna de las dos es un obstáculo a rodear. Las dos son decisiones de quien paga y de
quien es dueño de las llaves.

### 1. El token del agente no tiene alcance `workflow`

Su alcance medido es `gist, read:org, repo`. Un commit que tocara `.github/workflows/`
sería **rechazado al empujar**, así que el agente **ni siquiera podría instalar el
archivo** aunque quisiera. Eso no es una limitación que haya que documentar como excusa:
es la restricción funcionando, y es la razón por la que el workflow se entrega en `docs/`.

**Por qué no se puede inventar:** ampliar el alcance de un token es una decisión de
seguridad de su dueño. Un agente que se concede a sí mismo el permiso que le falta es
exactamente lo que esa restricción existe para impedir.

### 2. No existe una credencial de inferencia no interactiva

Medido: `gh secret list` devuelve vacío en los tres repositorios del núcleo. El redactor se
invoca hoy con una **sesión interactiva** del CLI, que un runner no tiene.

**Por qué no se puede inventar:** una llave de API es un secreto con coste. La crea quien
paga su consumo. No se reutiliza la de otro servicio ni se extrae de una sesión personal.

Con `con_redactor: false` —el valor por defecto del `workflow_dispatch`— la segunda
dependencia no hace falta: esa corrida detecta y deduplica sin invocar al modelo. **La
primera hace falta siempre**, porque sin ella el archivo no llega a instalarse.

---

## Qué trae el workflow, y qué deliberadamente no trae

| | |
|---|---|
| `workflow_dispatch` **primero**, con `limite` (0–3) y `con_redactor` (por defecto `false`) | Antes de que exista un cron hay que ver una corrida entera en ese entorno, que es justo lo que nadie ha visto |
| `schedule` **comentado** | Descomentarlo es la activación, y es el último de los tres movimientos, no el primero |
| `concurrency.group: canal-editorial` **fijo**, `cancel-in-progress: false` | El recurso que se disputa es uno solo —la bitácora—. Un group por rama daría dos corridas simultáneas sobre el mismo estado, que es como se corrompe la deduplicación. Y se **encola**, no se mata: matar a mitad deja trabajo que nadie cerró |
| `timeout-minutes: 25` | Un canal colgado consumiendo minutos es peor que uno que no corre |
| `permissions: contents: read`, checkout con `persist-credentials: false` | Las dos cerraduras que impiden que vuelva el paso que commiteaba. Sin permiso y sin credencial, un paso que lo intentara no podría |
| La compuerta de exposición corre **antes** de cualquier escritura al árbol público | Este repositorio es público y la corrida acaba de escribir en disco |
| El paso *el árbol de trabajo quedó intacto*, al final del job | Mide el árbol **y** las dos rutas históricas que `.gitignore` oculta: `git status --porcelain` no lista lo ignorado |
| **Ningún** paso commitea estado ni borradores a este repositorio | Se eliminó el paso *persistir estado y corpus*, que hacía `git add` + `git commit` + `git push` de la bitácora y del corpus a este repositorio **público** |
| **Ningún** paso sube un artefacto | Ver abajo |

### El registro de la corrida no se sube como artefacto, y «artefacto privado» no existe

El enunciado original de esta tarea pedía que el registro subiera como **artefacto
privado**. Eso no existe, y se deja escrito en vez de corregirlo en silencio:

- En un repositorio **público**, los artefactos de una corrida de Actions los descarga
  cualquiera que pueda ver el repositorio —o sea, cualquiera—. `actions/upload-artifact` no
  tiene ninguna opción de ACL.
- **Sanear el contenido no vuelve privado el artefacto.** Vuelve publicable su contenido,
  que es otra cosa. Confundir las dos era el defecto.

Así que el paso de subida se retiró. El registro se queda en `$EDITORIAL_ESTADO_DIR` —fuera
de todo árbol de git, con el número de corrida en el nombre— y el YAML deja escrito que
tener un registro descargable exigiría **o un repositorio privado, o un destino externo con
credencial**: las dos caen dentro del prerrequisito 3, que sigue abierto.

Y una regla que sobrevive al paso retirado, en su forma general:

> **Todo paso con `always()` cumple una de tres: no escribe, o exige que una compuerta
> anterior haya PASADO (`steps.<id>.outcome == 'success'`), o revalida por su cuenta lo que
> esa compuerta rechazó.**

Los cuatro pasos con `always()` se comprobaron uno por uno: tres no escriben y uno escribe,
y ese cuelga de `steps.dirs_privados.outcome == 'success'`. La prueba comprueba las dos
mitades: que hoy ninguno escribe sin compuerta, y que reponer uno pone la prueba roja.

---

## Un defecto que encontró la revisión y se cerró aquí, no como salvedad

`registro-de-corridas.mjs` resolvía su directorio con la constante
`scripts/editorial/estado`, que tras la migración del estado **ya no existe**. El comando
imprimía «0 corrida(s)» y salía **0**. Era el defecto de *un cero medido y un cero por
falta de dato se ven igual*: el registro salía vacío, un canal que no corrió se leía igual
que uno que corrió bien, y los dos pasos del workflow que dependen de ese comando eran
compuertas verdes sobre un archivo vacío.

Ahora resuelve con la validación canónica del canal y **aborta con código 1** si falta la
variable, con el error saneado —variable y código, nunca la ruta—. Y el paso que lo invoca
dejó de acotar con `| tail -5`: esa tubería devolvía el código de `tail`, que es 0 siempre,
así que se tragaba el `exit 1` y el comentario del paso prometía justo lo contrario.

---

## Cómo se comprueba

```
npm test                          # 371 pruebas, sin red y sin inferencia
npm run typecheck
npm run lint
npm run guard:canal
npm run guard:estado-editorial
npm run guard:exposicion
```

Las pruebas específicas de esta entrega:

```
node --test --conditions=react-server \
  scripts/editorial/pruebas/workflow-preparado.test.mjs \
  scripts/editorial/pruebas/workflow-no-commitea-estado.test.mjs
```

Cada archivo termina en una prueba que **rompe a propósito** lo que las demás comprueban y
verifica que se ponen rojas. Una prueba verde que no puede fallar no prueba nada.

---

## Qué queda abierto, y por qué esto no se puede activar todavía

No es una lista de deseos: sin esto, una corrida programada no sirve para lo que dice
servir.

1. **El alcance `workflow` del token** (arriba). Sin él el archivo no llega a instalarse.
2. **La credencial de inferencia no interactiva** (arriba). Sin ella solo corre
   `con_redactor: false`.
3. **Un almacén externo con respaldo** para `EDITORIAL_ESTADO_DIR` y
   `EDITORIAL_REDACCIONES_DIR`. Un runner es efímero: apuntarlas a un directorio del runner
   da **cero** persistencia, y cada corrida reprocesaría como nuevo todo lo ya visto.
   Elegir ese almacén no se decide en este PR.
4. ~~**`EDITORIAL_MAX_LLAMADAS` está declarado y NO ata.**~~ **CERRADO el 2026-09-25**, al
   partir el canal en `generar` y `verificar`. Lo medido cuando se escribió este documento
   —y se conserva porque borrarlo sería falsificar el registro— era que buscar la variable
   leída desde el entorno del proceso en `scripts/`, `lib/` y `app/` salía **vacío** y
   ningún `.mjs` de producción la nombraba: el grep suelto sí devolvía líneas, pero
   las cuatro eran de `workflow-preparado.test.mjs`, que comprueba que el YAML lo
   **declara** —no que alguien lo obedezca—, y citarlo como evidencia de lo segundo habría
   sido el error. **Hoy ata**: `generar.mjs` lo lee con `topeDeLlamadas()`, envuelve la vía
   de inferencia con `contadorDeLlamadas()` y **aborta la corrida** al llegar al tope,
   dejando pendiente lo que no intentó y sin subirle `intentos` a ninguna entrada. Su prueba
   trae el par que hace falta —superar el tope aborta, no superarlo no— en
   `pruebas/tres-comandos.test.mjs` caso 4. Los otros límites que atan siguen igual: el paso
   *límites de la corrida* (rechaza un `limite` fuera de 0–3 antes de gastar un minuto),
   `--limite N`, y `MAX_INTENTOS = 3` por entrada.

Mientras los tres primeros sigan abiertos, **esto es un documento, no un servicio**.

---

## Lo que este PR NO cambia

- **No cambia qué se vuelve público.** Una corrida programada jamás autoriza: deja las
  piezas en `terminada` —borrador verificado— y ahí se detiene. Lo único que escribe en
  `content/noticias/` es `autorizar.mjs`, que corre Rodrigo a mano.
- **No toca `public/proof/v1/**`.** No aparece en ningún paso.
- **No instala nada en `.github/workflows/`.** Una prueba lo comprueba.

## Archivos

| Archivo | Qué |
|---|---|
| `docs/plataforma/programacion/canal-editorial.yml` | El workflow preparado y desactivado |
| `docs/plataforma/programacion/00-donde-correria.md` | Dónde correría, qué falta, y qué se midió para decirlo |
| `docs/plataforma/programacion/02-el-pr-de-esta-entrega.md` | Este texto |
| `scripts/editorial/pruebas/workflow-preparado.test.mjs` | AC-PRG-01, AC-PRG-02 y AC-PRG-04, con sus mutaciones |
| `scripts/editorial/pruebas/workflow-no-commitea-estado.test.mjs` | AC-PRG-03, con sus mutaciones |
| `scripts/editorial/pruebas/workflow-canal.mjs` | El lector de YAML que usan las dos pruebas |
| `scripts/editorial/pruebas/directorio-fuera-de-git.test.mjs` | La validación de ruta que sostiene la compuerta |
| `scripts/editorial/ruta-estado.mjs` | Resuelve y valida `$EDITORIAL_ESTADO_DIR` para el workflow |
| `scripts/editorial/registro-de-corridas.mjs` | Lee el almacén externo y aborta si falta la variable |
