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

Fecha: 2026-09-15 · actualizado el 2026-09-17 · Rama: `feat/plataforma-editorial-y-actividad`

---

## Dónde podría correr, con lo que ya existe

Se midieron cinco opciones. Cada fila lleva el comando que la produjo.

| Opción | Qué hay ya | Qué falta | ¿La credencial es el bloqueo? |
|---|---|---|---|
| **GitHub Actions, este repo** | 4 workflows activos (`gh workflow list`), ya sobre **Node 24** (`ci.yml:39`), red saliente. **Cero `schedule`** hoy | Cerrar T-E1, **un almacén externo con respaldo** para el estado y los borradores, el archivo de workflow y el secret | **No solo la credencial: faltan T-E1 y el almacén** |
| VPS propio | Corre crons hoy (`/etc/cron.d/vps-monitor`, cada 5 min) y tiene secrets de acceso vivos | Runtime de Node —sin evidencia de que exista ahí— y acceso SSH para el agente | Sí, más un segundo hueco |
| n8n autoalojado | Crons corriendo hoy, varios workflows activos | Dispara, **no ejecuta Node**. Habría que reescribir la redacción como nodos | Parcialmente |
| n8n personal | 137 workflows, **todos los listados inactivos** | Todo | Sí |
| Vercel cron | — | **No hay `vercel.json` ni `vercel.ts`**. Invoca una ruta HTTP y no persiste ficheros | Sí, y el modelo no encaja |

**Recomendación: GitHub Actions en este mismo repositorio, condicionada a T-E1 y al
almacén.** Y el orden importa: **un runner es efímero, así que no tiene persistencia local
ni respaldo** (`02-editorial.md` §8.5). Son dos cosas distintas y las dos faltan aquí.
Declarar variables de entorno no proporciona ninguna de las dos: solo dice a dónde escribir.

**Commitear el estado y los borradores al repositorio no es la solución, y este documento ya
no la propone.** Este repositorio es público: versionar la bitácora y las redacciones publica
trabajo que todavía no es una decisión, y lo hace en silencio, sin que nadie autorice nada.
La política es que el árbol público lo escriba **únicamente** el comando de autorización, y
solo en `content/noticias/` (`02-editorial.md` §8.3). Hoy no se cumple: ese comando no existe
y `content/noticias/` tampoco —ver el estado medido más abajo—, y cerrarlo es T-E1.

La propuesta no requiere contratar un servicio para *ejecutar*. Sí requiere resolver **dónde
persiste el estado con respaldo** cuando el canal deje de correr en la máquina de Rodrigo.
Elegir ese almacén no se decide en este documento.

---

## Qué correría, exactamente: dos etapas de tres

El canal **se parte** en tres comandos (`02-editorial.md` §8.1) —hoy es uno solo y partirlo
es T-E1—, y una corrida programada ejecutaría **dos** de los tres:

| Etapa | ¿Corre en el cron? | Escribe en |
|---|---|---|
| **Generar** | Sí | El almacén privado de borradores (`EDITORIAL_REDACCIONES_DIR`) y el estado |
| **Verificar** | Sí | El sello sobre ese mismo borrador privado, y el estado |
| **Autorizar** | **Nunca** | `content/noticias/`, en el árbol de trabajo, y solo cuando Rodrigo lo ejecuta a mano |

**La programación automatiza el trabajo, no la decisión.** Una corrida desatendida deja
piezas en `terminada` —borrador verificado— y ahí se detiene. Que `autorizar` no exista en el
workflow es la razón por la que, **con el modelo de `02-editorial.md` §8.1 ya implementado**,
activar el cron no cambiaría qué se vuelve público: el runner no necesitaría ninguna ruta
hacia el árbol público del repositorio.

**Hoy no es así, y hay que decirlo donde se responde la pregunta:**
`canal-editorial.yml:183` commitea y empuja estado y corpus a este repositorio público, así
que activar el cron **antes** de T-E1 y T-E3 sí publica sin que nadie lo autorice —ver el
bullet de medición de abajo y el prerrequisito 2 de *Activar*—.

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
| **Exclusión de ejecuciones simultáneas** | `concurrency.group` nativo de Actions. `cancel-in-progress: false` a propósito: **se encola, no se mata**. Matar a mitad deja trabajo en un estado que nadie cerró | bloque `concurrency` |
| **Reintentos limitados y recuperación** | `MAX_INTENTOS = 3` por entrada en la máquina de estados; a la tercera se descarta con motivo. La corrida **arranca de la bitácora, no del feed**: lo que quedó a medias vuelve a la cola antes que lo detectado hoy | `estado.mjs`, `ejecutar.mjs` |
| **Límites de duración, piezas y consumo** | `timeout-minutes: 25`; `--limite N` acota piezas por corrida; `EDITORIAL_MAX_LLAMADAS` topa las llamadas al modelo | `env` y paso *corrida* |
| **Registros consultables sin contenido sensible** | `registro-de-corridas.mjs` deriva la bitácora a una tabla **sin títulos, URLs, prompts ni nombres de repositorio**. Se sube como artefacto con retención de 30 días | paso *registro de la corrida* |
| **Credencial y forma segura de suministrarla** | Secret del repositorio, leído del entorno. Nunca en el archivo, nunca en la línea de comandos | `env.ANTHROPIC_API_KEY` |

**Estado real al 2026-09-17, medido:** esta política todavía no se cumple en el árbol.

- `git ls-files scripts/editorial` devuelve `estado/bitacora.jsonl`, `estado/errores.jsonl`,
  `estado/fallos.jsonl`, `estado/vistos.jsonl` y
  `redacciones/marco-ailit-alfabetizacion-ia-educacion.json`: el estado y una redacción
  **están versionados en este repositorio público**.
- Las variables tienen *fallback* dentro del repositorio: `estado.mjs:153` y
  `ejecutar.mjs:66`. Ese `||` es el defecto, no una comodidad: con él el canal corre sin las
  variables y nadie se entera. **Y quitar los dos `||` no basta:** hay tres rutas más que
  resuelven dentro del repositorio *sin consultar variable alguna* —`comun.mjs:62`
  (`errores.jsonl`, escribe), `reverificar-corpus.mjs:24,58` (`RUTA_PIEZAS`, lee y escribe) y
  `comun.mjs:16` leída en `redactar.mjs:92` (redacciones, **hoy solo lectura**: ningún `.mjs`
  escribe ahí, y la variable `EDITORIAL_REDACCIONES_DIR` tampoco existe todavía)—. El
  inventario completo, con qué hace T-E1 en cada una, está en `02-editorial.md` §8.6.
- El workflow de referencia de este directorio **todavía contiene el paso *persistir estado y
  corpus*** (`canal-editorial.yml:183`), que hace `git add` del estado y del corpus, commitea
  y empuja a la rama de trabajo. **Eso es el defecto que T-E1 elimina, no el mecanismo de
  persistencia.** Se deja descrito aquí para que quede claro qué hay que borrar; el workflow
  sigue sin estar activado.
- No existe `content/noticias/` ni el estado `autorizada`.

Sacar los archivos del repositorio, eliminar ese paso, hacer obligatorias —sin fallback—
`EDITORIAL_ESTADO_DIR` y `EDITORIAL_REDACCIONES_DIR`, y partir el canal en los tres comandos
de `02-editorial.md` §8.1 es trabajo pendiente de **T-E1**. Sus valores concretos viven únicamente en el `.env`
local de Rodrigo; este documento no declara rutas. **Las variables obligatorias son dos, y
`EDITORIAL_PIEZAS` no es una de ellas: T-E1 la elimina, no la renombra** (`02-editorial.md`
§8.3 y §8.6, fila 2). El corpus intermedio que esa variable apunta deja de existir, porque
el borrador vive en `EDITORIAL_REDACCIONES_DIR` y lo único que llega al árbol público lo
escribe `autorizar` en `content/noticias/`.

Hay además una compuerta que no estaba en la lista: `auditoria-exposicion.mjs`. Este
repositorio es público y la corrida acaba de escribir en disco; si algo nombra un repositorio
privado, se para ahí. **No es la que sostiene esta política:** una auditoría que corre después
de escribir revisa lo que ya se escribió. Lo que impide publicar estado es que el estado no
esté nunca dentro del repositorio.

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
  la rama queda retirado del modelo** (`02-editorial.md` §8.3), pero **el paso sigue en el
  árbol**: `canal-editorial.yml:183` lo contiene hasta que T-E1 lo borre —ver el bullet de
  medición de arriba—. Así que lo que hay que probar es el almacén externo con respaldo, y
  ese almacén todavía no está elegido.
- El comportamiento real del `concurrency` bajo dos corridas solapadas.
- Cuánto tarda una corrida completa en un runner, contra los 25 minutos de tope.

**Una corrida manual (`workflow_dispatch`) con `con_redactor: false` no necesita
credencial y comprobaría casi todo lo anterior** salvo la inferencia. Es el
primer paso de prueba una vez cerrado T-E1; no debe activarse antes.

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
  los juicios de verificación. El tope de `EDITORIAL_MAX_LLAMADAS` existe
  precisamente para que un bucle inesperado no se lo coma.

## Activar, cuando se decida

**Tres prerrequisitos, y ninguno es la credencial:**

1. **Cerrar T-E1, con la compuerta de CI que lo sostiene** (`02-editorial.md` §8.6). Hasta
   entonces, activar el workflow commitea y empuja el estado y los borradores a este
   repositorio público — exactamente lo que `02-editorial.md` §8.3 prohíbe. Y sin la
   compuerta, cerrar T-E1 no impide que un `git add` distraído lo reabra en silencio.
2. **Borrar del workflow el paso *persistir estado y corpus*.** Mientras exista, activar el
   cron publica estado sin que nadie lo autorice.
3. **Elegir el almacén externo con respaldo** y probar una restauración. Un runner no tiene
   persistencia local ni respaldo; sin almacén, cada corrida arranca sin bitácora y vuelve a
   procesar como nuevo todo lo ya visto.

Después, tres movimientos en este orden:

1. Dar de alta el secret.
2. Mover `canal-editorial.yml` a `.github/workflows/`.
3. Correrlo a mano (`workflow_dispatch`) y mirar el registro. **Sólo si esa
   corrida sale bien**, descomentar el bloque `schedule`.

Hasta el paso 3 no hay cron. Y **la autorización** sigue desactivada en cualquier caso: una
corrida programada **jamás autoriza**. Las piezas se quedan en `terminada` —borrador
verificado— y solo Rodrigo, a mano, ejecuta el comando de autorización que escribe en
`content/noticias/`.

Que no autorice **no es lo mismo que no publicar nada**, y mientras los tres prerrequisitos
de arriba sigan abiertos son dos cosas distintas: el paso *persistir estado y corpus*
(`canal-editorial.yml:183`) empuja estado y corpus a este repositorio público sin pasar por
ninguna autorización. Por eso los prerrequisitos van **antes** que estos tres movimientos, y
no al revés.
